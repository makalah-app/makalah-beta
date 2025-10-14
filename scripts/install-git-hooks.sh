#!/usr/bin/env bash
set -euo pipefail

echo "Configuring Git hooks path to .githooks ..."
git config core.hooksPath .githooks

echo "Making pre-commit executable ..."
chmod +x .githooks/pre-commit

echo "\nDone. Pre-commit secret scan is enabled."
echo "Optional:"
echo "  - Install gitleaks:   brew install gitleaks   (or see https://github.com/gitleaks/gitleaks)"
echo "  - Install secretlint: npm i -D @secretlint/cli @secretlint/secretlint-rule-preset-recommend"

