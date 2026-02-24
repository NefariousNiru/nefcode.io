.PHONY: lint

lint:
	npx biome check --write .

cat:
	find .   \( -path "./dist" -o -path "./node_modules" \) -prune -o   -type f -print0 | xargs -0 cat > output.txt