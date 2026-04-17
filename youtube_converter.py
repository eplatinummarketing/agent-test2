#!/usr/bin/env python3

import argparse
import os
import sys

import yt_dlp


def _mp3_options(output_dir: str, quality: str) -> dict:
    quality_map = {"best": "0", "good": "2", "medium": "5", "low": "9"}
    return {
        "format": "bestaudio/best",
        "outtmpl": os.path.join(output_dir, "%(title)s.%(ext)s"),
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": quality_map.get(quality, "2"),
            }
        ],
    }


def _mp4_options(output_dir: str, quality: str) -> dict:
    format_map = {
        "best": "bestvideo+bestaudio/best",
        "1080p": "bestvideo[height<=1080]+bestaudio/best[height<=1080]",
        "720p": "bestvideo[height<=720]+bestaudio/best[height<=720]",
        "480p": "bestvideo[height<=480]+bestaudio/best[height<=480]",
        "360p": "bestvideo[height<=360]+bestaudio/best[height<=360]",
    }
    return {
        "format": format_map.get(quality, "bestvideo+bestaudio/best"),
        "outtmpl": os.path.join(output_dir, "%(title)s.%(ext)s"),
        "merge_output_format": "mp4",
    }


def convert(url: str, fmt: str, quality: str, output_dir: str) -> None:
    os.makedirs(output_dir, exist_ok=True)
    options = _mp3_options(output_dir, quality) if fmt == "mp3" else _mp4_options(output_dir, quality)

    with yt_dlp.YoutubeDL(options) as ydl:
        ydl.download([url])


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Download and convert YouTube videos to MP3 or MP4.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
quality options:
  mp3:  best | good (default) | medium | low
  mp4:  best (default) | 1080p | 720p | 480p | 360p

examples:
  python youtube_converter.py https://youtu.be/VIDEO_ID
  python youtube_converter.py https://youtu.be/VIDEO_ID -f mp4 -q 720p
  python youtube_converter.py https://youtu.be/VIDEO_ID -f mp3 -q best -o ~/Music
        """,
    )
    parser.add_argument("url", help="YouTube video or playlist URL")
    parser.add_argument(
        "-f", "--format",
        choices=["mp3", "mp4"],
        default="mp3",
        help="Output format (default: mp3)",
    )
    parser.add_argument(
        "-q", "--quality",
        default=None,
        help="Quality level (see below)",
    )
    parser.add_argument(
        "-o", "--output",
        default="downloads",
        metavar="DIR",
        help="Output directory (default: downloads/)",
    )

    args = parser.parse_args()

    if args.quality is None:
        args.quality = "good" if args.format == "mp3" else "best"

    print(f"URL:     {args.url}")
    print(f"Format:  {args.format.upper()}")
    print(f"Quality: {args.quality}")
    print(f"Output:  {os.path.abspath(args.output)}")
    print()

    try:
        convert(args.url, args.format, args.quality, args.output)
        print(f"\nSaved to: {os.path.abspath(args.output)}/")
    except yt_dlp.utils.DownloadError as exc:
        print(f"Download error: {exc}", file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nCancelled.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
