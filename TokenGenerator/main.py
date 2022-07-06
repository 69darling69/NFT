from cmath import log
import random
import sys
import time
import logging
from web3 import Web3
from settings import *

def main():
	logging.basicConfig(
		level=logging.INFO,
		format="%(asctime)s [%(levelname)s] %(message)s",
		handlers=[
			logging.FileHandler(LOG_FILE),
			logging.StreamHandler(sys.stdout)
		]
	)

	logging.info("Connecting to %s", PROVIDER_URL)
	web3 = Web3(Web3.HTTPProvider(PROVIDER_URL))

	if not web3.isConnected():
		logging.error("Can't connect")
		raise ConnectionError
	logging.info("Connected successfully")

	contract = web3.eth.contract(address=CONTRACT_ADDRESS, abi=ABI)
	event_filter = contract.events.Transfer.createFilter(fromBlock='latest')

	logging.info("Start polling each %s seconds", POLL_INTERVAL)
	while True:
			for event in event_filter.get_new_entries():
				print(Web3.toJSON(event))
			time.sleep(POLL_INTERVAL)

{
	"args":
		{
			"from":"0x0000000000000000000000000000000000000000",
			"to": "0x84318c704b798FC0b775b3A8883bF0B5b674cc33",
			"tokenId": 6
		},
	"event": "Transfer",
	"logIndex": 3,
	"transactionIndex": 4,
	"transactionHash": "0xb394c89ac848dc63f1197824ad80e7c0f24ec941a1e265e9efb42ff13f715f80",
	"address": "0x081c431772310532DC6EB7C66e35643384463f3C",
	"blockHash": "0xc1687fadcba2f47e0cd8b0d4f536a35ad2856fda4770e087724a97507c15991f",
	"blockNumber": 7179364
}

if __name__ == "__main__":
	try:
		main()
	except KeyboardInterrupt:
		logging.info("Stop polling\n")
	except:
		logging.exception("Error occured")

