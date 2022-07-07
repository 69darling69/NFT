import hashlib
import json
import random
import pathlib
import tempfile
import requests
import os
from dotenv import load_dotenv
from settings import *
from web3 import Web3
from web3.middleware import geth_poa_middleware


class Pinner:
	def __init__(self):
		load_dotenv()
		self.JWT = os.getenv("JWT")
		self.private_key = os.getenv("PRIVATE_KEY")
		self.address = os.getenv("ADDRESS_FROM")

		self.web3 = Web3(Web3.HTTPProvider(PROVIDER_URL))
		self.web3.middleware_onion.inject(geth_poa_middleware, layer=0)
		if not self.web3.isConnected():
			raise ConnectionError
		self.contract = self.web3.eth.contract(address=CONTRACT_ADDRESS, abi=ABI)
	
	def pin(self, dict, index):
		url = "https://api.pinata.cloud/pinning/pinJSONToIPFS"
		payload = json.dumps(dict)
		headers = {
			'Content-Type': 'application/json',
			'Authorization': f"Bearer {self.JWT}"
		}
		with open("TokenGenerator/Generator/metadata/Tokens", "r") as file:
			all_tokens_hash = file.read()
		old_cid = all_tokens_hash.split('\n')[-2].split()[-1]

		txn = self.contract.functions.CIDset(index, old_cid).buildTransaction({"from": self.address, "nonce": self.web3.eth.get_transaction_count(self.address)})
		signed_txn = self.web3.eth.account.sign_transaction(txn, private_key=self.private_key)
		self.web3.eth.send_raw_transaction(signed_txn.rawTransaction)

		return json.loads(requests.request("POST", url, headers=headers, data=payload).text)["IpfsHash"]
	
	@staticmethod
	def get_json(cid):
		return requests.get("https://gateway.pinata.cloud/ipfs/" + cid).text

class Generator:
	def __init__(self) -> None:
		self.path = pathlib.Path(__file__).parent.absolute().__str__()
		self.load_config()
		self.max_tokens = self.calc_max_tokens()
		self.pinner = Pinner()

		if self.generated_tokens_count() == 0:
			self.generate_new_token()

	def load_config(self):
		with open(self.path + "/config.json") as pathFile:
			self.config = json.loads("".join(pathFile.readlines()))

	def calc_max_tokens(self):
		max_tokens = 1
		for layer in self.config['layers']:
			max_tokens *= len(layer['values'])
		return max_tokens
	
	def generated_tokens_count(self):
		with open(self.path + "/metadata/Tokens", "r") as file:
			all_tokens_hash = file.read()
		return len(all_tokens_hash.split('\n')) - 1

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
		with open(self.path + f"/metadata/{index}.json", "w") as file:
			print(json.dumps(token).replace(' ', ''), file=file)
		
		cid = self.pinner.pin(token, index)

		with open(self.path + "/metadata/Tokens", "a") as file:
				print(hashlib.sha512(Pinner.get_json(cid).encode()).hexdigest(), cid, sep=" ", file=file)

	def is_token_unique(self, token):
		with open(self.path + "/metadata/Tokens", "r") as file:
			all_tokens_hash = file.read()

		return Generator.hash_of_token(token) not in all_tokens_hash.split('\n')
	
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
		new_token['salt'] = random.random()
		return new_token
	
	@staticmethod
	def hash_of_file(file_path):
		with open(file_path, "r") as file:
			data = file.read()
		return hashlib.sha512(data.encode()).hexdigest()

	@staticmethod
	def hash_of_token(token):
		tmp_file_path = tempfile.NamedTemporaryFile().name
		with open(tmp_file_path, "w") as file:
			print(json.dumps(token).replace(' ', ''), file=file)
		return Generator.hash_of_file(tmp_file_path)
