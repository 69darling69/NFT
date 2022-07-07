from functools import total_ordering
import pathlib
from flask import Flask, render_template

app = Flask(__name__)
root_path = pathlib.Path(__file__).parent.parent.absolute().__str__()

@app.route("/")
def hello_world():
    with open(root_path + "/TokenGenerator/Generator/metadata/Tokens", "r") as file:
        all_tokens_hash = file.read()
    hashes = all_tokens_hash.split()
    return render_template('index.html', hashes=hashes)

app.run()
