import os
import shutil
import signal
import subprocess
import sys
import tempfile
import time


MAX_CODE_SIZE = 100_000
MAX_INPUT_SIZE = 20_000
MAX_OUTPUT_SIZE = 20_000
DEFAULT_TIMEOUT_SECONDS = 5


LANGUAGE_ALIASES = {
    'c': 'c',
    'cpp': 'cpp',
    'c++': 'cpp',
    'java': 'java',
    'javascript': 'javascript',
    'js': 'javascript',
    'python': 'python',
    'py': 'python',
}


class CodeRunnerValidationError(ValueError):
    pass


def normalize_language(language):
    return LANGUAGE_ALIASES.get(str(language or '').strip().lower())


def _clip_output(value):
    if value is None:
        return ''
    if isinstance(value, bytes):
        value = value.decode('utf-8', errors='replace')
    value = str(value)
    if len(value) <= MAX_OUTPUT_SIZE:
        return value
    return f'{value[:MAX_OUTPUT_SIZE]}\n[output truncated]'


def _base_env(temp_dir):
    return {
        'HOME': temp_dir,
        'LANG': os.environ.get('LANG', 'C.UTF-8'),
        'PATH': os.environ.get('PATH', ''),
        'PYTHONIOENCODING': 'utf-8',
        'TMPDIR': temp_dir,
    }


def _kill_process_tree(process):
    if process.poll() is not None:
        return
    if os.name == 'nt':
        process.kill()
        return
    try:
        os.killpg(process.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass


def _run_process(command, temp_dir, program_input='', timeout_seconds=DEFAULT_TIMEOUT_SECONDS):
    start = time.monotonic()
    process = subprocess.Popen(
        command,
        cwd=temp_dir,
        env=_base_env(temp_dir),
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        start_new_session=os.name != 'nt',
    )

    timed_out = False
    try:
        stdout, stderr = process.communicate(program_input or '', timeout=timeout_seconds)
    except subprocess.TimeoutExpired:
        timed_out = True
        _kill_process_tree(process)
        stdout, stderr = process.communicate()

    duration_ms = int((time.monotonic() - start) * 1000)
    return {
        'stdout': _clip_output(stdout),
        'stderr': _clip_output(stderr),
        'exit_code': process.returncode,
        'timed_out': timed_out,
        'duration_ms': duration_ms,
    }


def _missing_binaries(binary_names):
    return [binary for binary in binary_names if not shutil.which(binary)]


def _setup_failure(language, missing_binaries):
    runtime_names = ', '.join(missing_binaries)
    return {
        'language': language,
        'success': False,
        'stage': 'setup',
        'stdout': '',
        'stderr': f'Missing runtime/compiler: {runtime_names}',
        'exit_code': None,
        'timed_out': False,
        'duration_ms': 0,
    }


def _write_source(temp_dir, filename, source_code):
    source_path = os.path.join(temp_dir, filename)
    with open(source_path, 'w', encoding='utf-8') as source_file:
        source_file.write(source_code)
    return source_path


def _language_commands(language, temp_dir, source_code):
    if language == 'python':
        source_path = _write_source(temp_dir, 'main.py', source_code)
        return (), None, [sys.executable, '-I', source_path]

    if language == 'javascript':
        source_path = _write_source(temp_dir, 'main.js', source_code)
        return ('node',), None, ['node', source_path]

    if language == 'c':
        source_path = _write_source(temp_dir, 'main.c', source_code)
        output_path = os.path.join(temp_dir, 'main')
        return ('gcc',), ['gcc', source_path, '-O2', '-std=c11', '-o', output_path], [output_path]

    if language == 'cpp':
        source_path = _write_source(temp_dir, 'main.cpp', source_code)
        output_path = os.path.join(temp_dir, 'main')
        return ('g++',), ['g++', source_path, '-O2', '-std=c++17', '-o', output_path], [output_path]

    if language == 'java':
        source_path = _write_source(temp_dir, 'Main.java', source_code)
        return ('javac', 'java'), ['javac', source_path], ['java', '-cp', temp_dir, 'Main']

    raise CodeRunnerValidationError('Unsupported language.')


def run_code(language, source_code, program_input='', timeout_seconds=DEFAULT_TIMEOUT_SECONDS):
    normalized_language = normalize_language(language)
    if not normalized_language:
        raise CodeRunnerValidationError('Unsupported language.')

    source_code = source_code or ''
    program_input = program_input or ''
    if len(source_code) > MAX_CODE_SIZE:
        raise CodeRunnerValidationError('Code is too large to run.')
    if len(program_input) > MAX_INPUT_SIZE:
        raise CodeRunnerValidationError('Input is too large to run.')

    with tempfile.TemporaryDirectory(prefix='tutorlix-code-') as temp_dir:
        required_binaries, compile_command, run_command = _language_commands(
            normalized_language,
            temp_dir,
            source_code,
        )
        missing_binaries = _missing_binaries(required_binaries)
        if missing_binaries:
            return _setup_failure(normalized_language, missing_binaries)

        if compile_command:
            compile_result = _run_process(compile_command, temp_dir, timeout_seconds=timeout_seconds)
            if compile_result['timed_out'] or compile_result['exit_code'] != 0:
                return {
                    **compile_result,
                    'language': normalized_language,
                    'success': False,
                    'stage': 'compile',
                }

        run_result = _run_process(
            run_command,
            temp_dir,
            program_input=program_input,
            timeout_seconds=timeout_seconds,
        )
        return {
            **run_result,
            'language': normalized_language,
            'success': not run_result['timed_out'] and run_result['exit_code'] == 0,
            'stage': 'run',
        }
