#!/usr/bin/env python3

import argparse
import sys

import riva.client


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Transcribe audio through NVIDIA Riva / NIM ASR.")
    parser.add_argument("--input-file", required=True)
    parser.add_argument("--api-key", required=True)
    parser.add_argument("--server", default="grpc.nvcf.nvidia.com:443")
    parser.add_argument("--function-id", required=True)
    parser.add_argument("--language-code", default="multi")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    auth = riva.client.Auth(
        use_ssl=True,
        uri=args.server,
        metadata_args=[
            ("function-id", args.function_id),
            ("authorization", f"Bearer {args.api_key}"),
        ],
        options=[
            ("grpc.max_receive_message_length", 64 * 1024 * 1024),
            ("grpc.max_send_message_length", 64 * 1024 * 1024),
        ],
    )

    service = riva.client.ASRService(auth)
    config = riva.client.RecognitionConfig(
        language_code=args.language_code,
        enable_automatic_punctuation=True,
        verbatim_transcripts=False,
    )

    with open(args.input_file, "rb") as handle:
        payload = handle.read()

    response = service.offline_recognize(payload, config)
    lines = []
    for result in response.results:
        if not result.alternatives:
            continue
        transcript = result.alternatives[0].transcript.strip()
        if transcript:
            lines.append(transcript)

    if not lines:
        print("No transcript text returned by NVIDIA ASR.", file=sys.stderr)
        return 1

    print(" ".join(lines).strip())
    return 0


if __name__ == "__main__":
    sys.exit(main())
