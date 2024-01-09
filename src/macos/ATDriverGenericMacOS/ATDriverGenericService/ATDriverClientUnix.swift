//
//  ATDriverClientUnix.swift
//  ATDriverGenericMacOS
//
//  Created by Z Goddard on 1/4/24.
//

import Foundation

class ATDriverClientUnix {

  class SocketResource {
    var descriptor: Int32
    init() throws {
      descriptor = socket(
        AF_UNIX,
        SOCK_STREAM,
        0)
      guard descriptor > -1 else {
        throw ATDriverEventError.badSocketSettings(posixErrorString())
      }
    }
    deinit {
      close(descriptor)
    }
  }

  static let pipe = "/usr/local/var/at_driver_generic/driver.socket"

  func sendInitEvent() throws {
    try self._sendEvent(name: "lifecycle", data: "hello")
  }

  func sendGoodbyeEvent() throws {
    try self._sendEvent(name: "lifecycle", data: "goodbye")
  }

  func sendSpeechEvent(speech: String) throws {
    try self._sendEvent(name: "speech", data: speech)
  }

  func sendCancelEvent() throws {
    try self._sendEvent(name: "lifecycle", data: "cancel")
  }

  func _connect() throws -> SocketResource {
    let socket = try SocketResource()

    var unixAddr = sockaddr_un()
    let pathSize = size_t(MemoryLayout.size(ofValue: unixAddr.sun_path))
    unixAddr.sun_family = sa_family_t(AF_UNIX)
    ATDriverClientUnix.pipe.withCString { pipeAddress in
      strncpy(&unixAddr.sun_path, pipeAddress, pathSize)
      return
    }

    let unixAddrSize = socklen_t(MemoryLayout.size(ofValue: unixAddr))
    // Get UnsafePointer to addr
    try withUnsafePointer(to: &unixAddr) { unsafeUnixAddr in
      // Cast UnsafePointer<sockaddr_un> to UnsafePointer<sockaddr>
      try unsafeUnixAddr.withMemoryRebound(to: sockaddr.self, capacity: 1) { addr in
        guard connect(socket.descriptor, addr, unixAddrSize) > -1 else {
          throw ATDriverEventError.didNotConnect(posixErrorString())
        }
      }
    }

    return socket
  }

  func _makeMessage(name: String, data: String) -> String {
    return "\(name):\(data)"
  }

  func _sendEvent(name: String, data: String) throws {
    let socket = try _connect()

    let message = _makeMessage(name: name, data: data)

    try message.utf8CString.withUnsafeBufferPointer { unsafeMessageBuffer in
      let unsafeMessage = unsafeMessageBuffer.baseAddress!
      guard write(socket.descriptor, unsafeMessage, strlen(unsafeMessage)) > -1 else {
        throw ATDriverEventError.sendFailure(posixErrorString())
      }
    }
  }
}
