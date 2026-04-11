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
	rider FluTable.slnx

build:
	dotnet build FluTable.slnx

clean:
	dotnet clean FluTable.slnx

restore:
	dotnet restore FluTable.slnx
