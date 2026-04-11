.DEFAULT_GOAL := help

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "  run      start the dev server"
	@echo "  build    build the solution"
	@echo "  clean    clean build outputs"
	@echo "  restore  restore NuGet packages"
	@echo "  rider    open solution in JetBrains Rider"

run:
	dotnet run

rider:
	rider FluentTable.slnx

build:
	dotnet build FluentTable.slnx

clean:
	dotnet clean FluentTable.slnx

restore:
	dotnet restore FluentTable.slnx
