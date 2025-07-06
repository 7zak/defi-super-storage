#!/bin/bash

# DeFiStorage Contract Validation Script

echo "🔍 Validating DeFiStorage Smart Contract..."

# Check if Clarinet is available
if command -v clarinet &> /dev/null; then
    echo "✅ Clarinet found, running syntax check..."
    clarinet check
    
    echo "🧪 Running test suite..."
    clarinet test
    
    echo "📊 Generating test coverage..."
    clarinet test --coverage
else
    echo "⚠️  Clarinet not found. Please install Clarinet to run full validation."
    echo "   Installation: https://github.com/hirosystems/clarinet"
fi

# Basic file structure validation
echo "📁 Validating project structure..."

required_files=(
    "contracts/DeFiStorage.clar"
    "tests/defi-storage_test.ts"
    "Clarinet.toml"
    "README.md"
    "LICENSE"
    "DEVELOPMENT.md"
    "settings/Devnet.toml"
    "settings/Testnet.toml"
)

for file in "${required_files[@]}"; do
    if [[ -f "$file" ]]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
    fi
done

# Check contract syntax basics
echo "🔧 Basic syntax validation..."

if grep -q "define-constant\|define-map\|define-public\|define-read-only" contracts/DeFiStorage.clar; then
    echo "✅ Contract contains required Clarity constructs"
else
    echo "❌ Contract missing basic Clarity constructs"
fi

if grep -q "ERR-PROVIDER-NOT-FOUND\|ERR-INSUFFICIENT-STORAGE\|ERR-INVALID-PAYMENT" contracts/DeFiStorage.clar; then
    echo "✅ Error codes defined correctly"
else
    echo "❌ Error codes missing or incorrect"
fi

echo "🎉 Validation complete!"
