from flask import Flask, render_template

app = Flask(__name__)

@app.route("/")
def hello_world():
    with open("TokenGenerator/Generator/metadata/Tokens", "r") as file:
        all_tokens_hash = file.read()
    hashes = all_tokens_hash.split()
    return render_template('index.html', hashes=hashes)

app.run()
