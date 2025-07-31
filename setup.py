#!/usr/bin/env python3
"""
CodegenApp - AI Agent Run Manager
A comprehensive application for managing AI agent runs with a React frontend and FastAPI backend.
"""

from setuptools import setup, find_packages
import os

# Read the contents of README file
this_directory = os.path.abspath(os.path.dirname(__file__))
with open(os.path.join(this_directory, 'README.md'), encoding='utf-8') as f:
    long_description = f.read()

# Read requirements from requirements.txt
def read_requirements():
    requirements = []
    if os.path.exists('requirements.txt'):
        with open('requirements.txt', 'r') as f:
            requirements = [line.strip() for line in f if line.strip() and not line.startswith('#')]
    return requirements

setup(
    name="codegenapp",
    version="1.0.0",
    author="Zeeeepa",
    author_email="your-email@example.com",
    description="AI Agent Run Manager - Create and manage AI agent runs",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/Zeeeepa/codegenApp",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Internet :: WWW/HTTP :: WSGI :: Application",
    ],
    python_requires=">=3.8",
    install_requires=read_requirements(),
    extras_require={
        'dev': [
            'pytest>=6.0',
            'pytest-asyncio>=0.18.0',
            'black>=22.0',
            'flake8>=4.0',
            'mypy>=0.950',
        ],
    },
    entry_points={
        'console_scripts': [
            'codegen=codegenapp.cli:main',
        ],
    },
    include_package_data=True,
    package_data={
        'codegenapp': [
            'frontend/build/**/*',
            'backend/**/*',
        ],
    },
    zip_safe=False,
)
