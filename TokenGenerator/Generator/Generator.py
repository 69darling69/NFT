import hashlib
import json
import random


class Generator:
	def __init__(self) -> None:
		self.load_config()
		self.max_tokens = self.calc_max_tokens()

	def load_config(self):
		with open("Generator/config.json") as pathFile:
			self.config = json.loads("".join(pathFile.readlines()))

	def calc_max_tokens(self):
		max_tokens = 1
		for layer in self.config['layers']:
			max_tokens *= len(layer['values'])
		return max_tokens
	
	def generated_tokens_count(self):
		with open("Generator/metadata/Tokens", "r") as file:
			all_tokens_hash = file.read()
		return len(all_tokens_hash.split())

	def generate_new_token(self):
		if self.generated_tokens_count() >= self.max_tokens:
			raise Exception("Max tokens overfull")

		while True:
			token = self.new_token()
			
			if not self.is_token_compatible(token) or not self.is_token_unique(token):
				continue

			self.add_token_to_list(token)
			break
	
	def add_token_to_list(self, token):
		index = self.generated_tokens_count()
		with open(f"Generator/metadata/{index}.json", "w") as file:
			json.dump(token, file)

		with open("Generator/metadata/Tokens", "a") as file:
				print(self.hash_of_token(token), file=file)

	def is_token_unique(self, token):
		with open("Generator/metadata/Tokens", "r") as file:
			all_tokens_hash = file.read()

		return Generator.hash_of_token(token) not in all_tokens_hash.split()
	
	def is_token_compatible(self, token):
		for incomp in self.config["incompatibilities"]:
			for attr in token:
				if token[incomp["layer"]] == incomp["value"] and token[attr] in incomp["incompatible_with"]:
					return False
		return True
	
	def new_token(self):
		new_token = {}
		for layer in self.config["layers"]:
			new_token[layer["name"]] = random.choices(layer["values"], layer["weights"])[0]
		return new_token
	
	@staticmethod
	def hash_of_file(file_path):
		with open(file_path, "r") as file:
			data = file.read()
		return hashlib.sha512(data.encode()).hexdigest()

	@staticmethod
	def hash_of_token(token):
		with open("Generator/metadata/tmp.json", "w") as file:
			json.dump(token, file)
		return Generator.hash_of_file("Generator/metadata/tmp.json")

generator = Generator()

for _ in range(generator.max_tokens):
	generator.generate_new_token()
