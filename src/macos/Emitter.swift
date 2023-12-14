//
//  Emitter.swift
//  ATDriverVoiceExtension
//
//  Created by Z Goddard on 4/6/23.
//

import Foundation
import os

let SOCKET_PATH = "/private/var/run/atdriver-generic.sock"

private let log = Logger(subsystem: "com.bocoup.atdriver", category: "emitter")

enum EmitterEventType {
  case Error
  case Speech
  case LifeCycle

  public var description: String {
    switch self {
    case .Error:
      return "internalError"
    case .LifeCycle:
      return "lifecycle"
    case .Speech:
      return "speech"
    }
  }
}

struct EmitterEvent {
  var eventType: EmitterEventType
  var message: String
}

class Emitter: NSObject {
  @objc override init() {
    super.init()
    log.info("Emitter initialized 4")
  }

  func emit(_ eventType: EmitterEventType, _ message: String) {
    log.info("Emitting \(eventType.description):\(message)")
    return
      RunLoop.main.perform {
        guard let address = SOCKET_PATH.data(using: String.Encoding.utf8) else {
          return
        }
        guard
          let socket = SocketPort(
            protocolFamily: AF_UNIX, socketType: SOCK_STREAM, protocol: 0, address: address)
        else {
          log.debug("Failed to initialize socket")
          return
        }
        guard let data = "\(eventType.description):\(message)".data(using: String.Encoding.utf8)
        else {
          return
        }
        PortMessage(send: socket, receive: socket, components: [data]).send(before: Date.now)
        socket.invalidate()
      }
  }
}
