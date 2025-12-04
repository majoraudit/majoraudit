import os
import pylibmql
import tempfile
import shutil
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(SCRIPT_DIR, "..", "major_templates_compiled")

os.makedirs(OUTPUT_DIR, exist_ok=True)

tmpdir = tempfile.mkdtemp()

SKIP = ["african_american_studies", "anthropology", "archaeological_studies", "applied_mathematics", "applied_physics", "african_studies"]

count = 0

for root, dirs, files in os.walk(SCRIPT_DIR):
    if root == SCRIPT_DIR:
        print("in root")
        continue

    sub = root.replace(SCRIPT_DIR, "").removeprefix("/")

    if sub in SKIP:
        continue

    tmpdir_major = os.path.join(tmpdir, sub)
    os.mkdir(tmpdir_major)

    for file in files:
        _, extension = os.path.splitext(file)
        if extension == ".mql":
            mql_file_path = os.path.join(SCRIPT_DIR, root, file)

            count += 1

            with open(mql_file_path, "r") as mql_file:
                string_contents = mql_file.read()
                mql_as_json = None
                try:
                    mql_outputs = pylibmql.parse(string_contents)
                    mql_as_json = mql_outputs.json()
                except ValueError as e:
                    print(f"⚠️\tMQL SYNTAX ERROR IN {file}", file=sys.stderr)
                    raise e

            tmp_filepath = os.path.join(tmpdir_major, file)

            if mql_as_json is not None:
                with open(tmp_filepath, "w") as output_file:
                    output_file.write(mql_as_json)

            print(f"🔵 {count:04d}\tTransformed {file}")
        elif extension == ".json":
            pass
        else:
            print(f"🟨 Warning: non .mql/.json file extension encountered: '{file}'")


shutil.copytree(tmpdir, OUTPUT_DIR, dirs_exist_ok=True)

print(f"🟩 Compiled {count} files")