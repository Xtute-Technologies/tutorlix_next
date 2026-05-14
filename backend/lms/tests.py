from django.test import SimpleTestCase

from lms.code_runner import CodeRunnerValidationError, run_code


class CodeRunnerTests(SimpleTestCase):
    def test_python_code_returns_stdout(self):
        result = run_code('python', "name = input()\nprint(f'Hello {name}')", 'Tutorlix')

        self.assertTrue(result['success'], result)
        self.assertEqual(result['stdout'].strip(), 'Hello Tutorlix')
        self.assertEqual(result['stage'], 'run')

    def test_unsupported_language_raises_validation_error(self):
        with self.assertRaises(CodeRunnerValidationError):
            run_code('ruby', 'puts "hello"')
