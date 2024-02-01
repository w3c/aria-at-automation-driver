//
//  ATDriverEventError.swift
//  ATDriverGenericMacOS
//
//  Created by Z Goddard on 1/4/24.
//

import Foundation

enum ATDriverEventError: Error {
  /// Failed to allocate socket resource with given settings.
  case badSocketSettings(String)
  /// Failed to connect to remote.
  case didNotConnect(String)
  /// Failed to write data to socket.
  case sendFailure(String)
}

func posixErrorString() -> String {
  return String(cString: strerror(errno))
}
