.DEFAULT_GOAL := help

# ── Load .env if present (ignored by git, stores NUGET_KEY) ─────────
ifneq (,$(wildcard .env))
    include .env
    export
endif

# Paths
LIB_PROJECT := FluTable/FluTable.csproj
PACK_OUTPUT := FluTable/bin/Release
NUGET_SOURCE := https://api.nuget.org/v3/index.json

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Development:"
	@echo "  run       start the demo dev server"
	@echo "  build     build the solution"
	@echo "  clean     clean build outputs"
	@echo "  restore   restore NuGet packages"
	@echo "  rider     open solution in JetBrains Rider"
	@echo ""
	@echo "NuGet publish (library):"
	@echo "  pack      dotnet pack FluTable into $(PACK_OUTPUT)"
	@echo "  push      push latest .nupkg to nuget.org (requires NUGET_KEY in .env)"
	@echo "  publish   pack + push"

run:
	dotnet run

rider:
	rider FluTable.slnx

build:
	dotnet build FluTable.slnx

clean:
	dotnet clean FluTable.slnx

restore:
	dotnet restore FluTable.slnx

# ── NuGet publish targets ───────────────────────────────────────────

pack:
	dotnet pack $(LIB_PROJECT) -c Release

push:
	@if [ -z "$(NUGET_KEY)" ]; then \
		echo "ERROR: NUGET_KEY is not set. Create a .env file with:"; \
		echo "  NUGET_KEY=your_nuget_api_key_here"; \
		exit 1; \
	fi
	@PKG=$$(ls -t $(PACK_OUTPUT)/FluTable.*.nupkg 2>/dev/null | grep -v symbols | head -n1); \
	if [ -z "$$PKG" ]; then \
		echo "ERROR: no .nupkg found in $(PACK_OUTPUT). Run 'make pack' first."; \
		exit 1; \
	fi; \
	echo "Pushing $$PKG"; \
	dotnet nuget push "$$PKG" --api-key "$(NUGET_KEY)" --source $(NUGET_SOURCE)

publish: pack push
