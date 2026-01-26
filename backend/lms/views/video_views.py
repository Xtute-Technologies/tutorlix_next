from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import FileResponse
import logging
import tempfile
import subprocess
import os
import json

from lms.permissions import IsAdmin

logger = logging.getLogger(__name__)


class VideoViewSet(viewsets.ViewSet):
    """
    Multi-slide Canva-style video renderer

    Input:
      - slides (JSON)
      - image_0, image_1, ...
      - audio_0, audio_1, ... (optional)

    Output:
      - Single MP4 (vertical)
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    @action(detail=False, methods=["post"], url_path="render")
    def render_video(self, request):
        user = request.user

        slides_json = request.POST.get("slides")
        if not slides_json:
            return Response(
                {"error": "slides are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        slides = json.loads(slides_json)
        if not slides:
            return Response(
                {"error": "slides cannot be empty"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        logger.info("Multi-slide render started user=%s slides=%s", user.id, len(slides))

        temp_files = []
        slide_videos = []

        try:
            # 1️⃣ Generate video per slide
            for index, slide in enumerate(slides):
                image = request.FILES.get(f"image_{index}")
                audio = request.FILES.get(f"audio_{index}")  # optional

                if not image:
                    return Response(
                        {"error": f"image_{index} is required"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Save image
                with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as img:
                    for chunk in image.chunks():
                        img.write(chunk)
                    image_path = img.name
                temp_files.append(image_path)

                # Save audio if exists
                audio_path = None
                if audio:
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as aud:
                        for chunk in audio.chunks():
                            aud.write(chunk)
                        audio_path = aud.name
                    temp_files.append(audio_path)

                # Output slide video
                fd, slide_video = tempfile.mkstemp(suffix=".mp4")
                os.close(fd)
                slide_videos.append(slide_video)

                # FFmpeg command (ONE SLIDE)
                cmd = [
                    "ffmpeg",
                    "-y",
                    "-loop", "1",
                    "-i", image_path,
                ]

                if audio_path:
                    cmd += ["-i", audio_path]
                else:
                    cmd += [
                        "-f", "lavfi",
                        "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
                    ]

                cmd += [
                    "-t", "4",
                    "-vf",
                    "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
                    "-c:v", "libx264",
                    "-c:a", "aac",
                    "-pix_fmt", "yuv420p",
                    "-shortest",
                    "-movflags", "+faststart",
                    slide_video,
                ]

                subprocess.run(cmd, check=True)

            # 2️⃣ Create concat file
            concat_file = tempfile.NamedTemporaryFile(delete=False, mode="w", suffix=".txt")
            for vid in slide_videos:
                concat_file.write(f"file '{vid}'\n")
            concat_file.close()
            temp_files.append(concat_file.name)

            # 3️⃣ Final output
            fd, final_video = tempfile.mkstemp(suffix=".mp4")
            os.close(fd)

            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-f", "concat",
                    "-safe", "0",
                    "-i", concat_file.name,
                    "-c", "copy",
                    final_video,
                ],
                check=True,
            )

            logger.info("Multi-slide video completed user=%s", user.id)

            return FileResponse(
                open(final_video, "rb"),
                content_type="video/mp4",
                as_attachment=True,
                filename="tutorlix-micro-video.mp4",
            )

        except Exception:
            logger.exception("Multi-slide render failed user=%s", user.id)
            return Response(
                {"error": "Video rendering failed"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        finally:
            # Cleanup temp files (except final video)
            for path in temp_files:
                try:
                    if path and os.path.exists(path):
                        os.remove(path)
                except Exception:
                    pass
