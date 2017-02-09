// Copyright 2015-2017 Parity Technologies (UK) Ltd.
// This file is part of Parity.

// Parity is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Parity is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Parity.  If not, see <http://www.gnu.org/licenses/>.

extern crate rlp;
extern crate ethcore;
extern crate ethcore_util as util;
extern crate hyper;
extern crate cid;
extern crate multihash;

use util::{Bytes, H256};
use multihash::Hash;
use cid::{ToCid, Codec};
use hyper::server::{Handler, Server, Request, Response};
use hyper::net::HttpStream;
use hyper::header::{ContentLength, ContentType};
use hyper::{Next, Encoder, Decoder, Method, RequestUri, StatusCode};
use ethcore::client::{BlockId, TransactionId, BlockChainClient};
use std::sync::Arc;
use std::thread;
use std::ops::Deref;

type Reason = &'static str;

enum Out {
	OctetStream(Bytes),
	NotFound(Reason),
	Bad(Reason),
}

struct IpfsHandler {
	client: Arc<BlockChainClient>,
	out: Out,
}

enum Error {
	CidParsingFailed,
	UnsupportedHash,
	UnsupportedCid,
	BlockNotFound,
	TransactionNotFound,
}

impl From<Error> for Out {
	fn from(err: Error) -> Out {
		use Error::*;

		match err {
			UnsupportedHash => Out::Bad("Hash must be Keccak-256"),
			UnsupportedCid => Out::Bad("CID codec not supported"),
			CidParsingFailed => Out::Bad("CID parsing failed"),
			BlockNotFound => Out::NotFound("Block not found"),
			TransactionNotFound => Out::NotFound("Transaction not found"),
		}
	}
}

impl From<cid::Error> for Error {
	fn from(_: cid::Error) -> Error {
		Error::CidParsingFailed
	}
}

impl From<multihash::Error> for Error {
	fn from(_: multihash::Error) -> Error {
		Error::CidParsingFailed
	}
}

impl IpfsHandler {
	fn route(&mut self, path: &str, query: Option<&str>) -> Next {
		let result = match path {
			"/api/v0/block/get" => self.route_cid(query),
			_ => return Next::write(),
		};

		match result {
			Ok(_) => Next::write(),
			Err(err) => {
				self.out = err.into();

				Next::write()
			}
		}
	}

	fn route_cid(&mut self, query: Option<&str>) -> Result<(), Error> {
		let query = query.unwrap_or("");

		let cid = get_param(&query, "arg").ok_or(Error::CidParsingFailed)?.to_cid()?;

		let mh = multihash::decode(&cid.hash)?;

		if mh.alg != Hash::Keccak256 { return Err(Error::UnsupportedHash); }

		let hash: H256 = mh.digest.into();

		match cid.codec {
			Codec::EthereumBlock => self.get_block(hash),
			Codec::EthereumTx => self.get_transaction(hash),
			_ => return Err(Error::UnsupportedCid),
		}
	}

	fn get_block(&mut self, hash: H256) -> Result<(), Error> {
		let block_id = BlockId::Hash(hash);
		let block = self.client.block(block_id).ok_or(Error::BlockNotFound)?;

		self.out = Out::OctetStream(block.into_inner());

		Ok(())
	}

	fn get_transaction(&mut self, hash: H256) -> Result<(), Error> {
		let tx_id = TransactionId::Hash(hash);
		let tx = self.client.transaction(tx_id).ok_or(Error::TransactionNotFound)?;

		self.out = Out::OctetStream(rlp::encode(tx.deref()).to_vec());

		Ok(())
	}
}

/// Get a query parameter's value by name.
pub fn get_param<'a>(query: &'a str, name: &str) -> Option<&'a str> {
	query.split('&')
		.find(|part| part.starts_with(name) && part[name.len()..].starts_with("="))
		.map(|part| &part[name.len() + 1..])
}

impl Handler<HttpStream> for IpfsHandler {
	fn on_request(&mut self, req: Request<HttpStream>) -> Next {
		if *req.method() != Method::Get {
			return Next::write();
		}

		let (path, query) = match *req.uri() {
			RequestUri::AbsolutePath { ref path, ref query } => (path, query.as_ref().map(AsRef::as_ref)),
			_ => return Next::write(),
		};

		self.route(path, query)
	}

	fn on_request_readable(&mut self, _decoder: &mut Decoder<HttpStream>) -> Next {
		Next::write()
	}

	fn on_response(&mut self, res: &mut Response) -> Next {
		use Out::*;

		match self.out {
			OctetStream(ref bytes) => {
				let headers = res.headers_mut();

				headers.set(ContentLength(bytes.len() as u64));
				headers.set(ContentType("application/octet-stream".parse()
					.expect("Static content type; qed")));

				Next::write()
			},
			NotFound(reason) => {
				res.set_status(StatusCode::NotFound);

				res.headers_mut().set(ContentLength(reason.len() as u64));
				res.headers_mut().set(ContentType("text/plain".parse()
					.expect("Static content type; qed")));

				Next::write()
			},
			Bad(reason) => {
				res.set_status(StatusCode::BadRequest);

				res.headers_mut().set(ContentLength(reason.len() as u64));
				res.headers_mut().set(ContentType("text/plain".parse()
					.expect("Static content type; qed")));

				Next::write()
			}
		}
	}

	fn on_response_writable(&mut self, transport: &mut Encoder<HttpStream>) -> Next {
		use Out::*;

		match self.out {
			OctetStream(ref bytes) => {
				// Nothing to do here
				let _ = transport.write(&bytes);

				Next::end()
			},
			NotFound(reason) | Bad(reason) => {
				// Nothing to do here
				let _ = transport.write(reason.as_bytes());

				Next::end()
			}
		}
	}
}

pub fn start_server(client: Arc<BlockChainClient>) {
	thread::spawn(move || {
		let addr = "0.0.0.0:5001".parse().unwrap();

		Server::http(&addr).unwrap().handle(move |_| IpfsHandler {
			client: client.clone(),
			out: Out::NotFound("Route not found")
		}).unwrap();
	});
}

#[cfg(test)]
mod tests {
	use super::*;

   #[test]
	fn test_get_param() {
		let query = "foo=100&bar=200&qux=300";

		assert_eq!(get_param(query, "foo"), Some("100"));
		assert_eq!(get_param(query, "bar"), Some("200"));
		assert_eq!(get_param(query, "qux"), Some("300"));
	}
}
