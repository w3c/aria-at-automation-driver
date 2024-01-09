//
//  ATDriverGenericService.swift
//  ATDriverGenericService
//
//  Created by Z Goddard on 12/20/23.
//

import Foundation
import os

class ATDriverGenericService: NSObject, ATDriverGenericServiceProtocol {
  let logger = Logger(subsystem: "com.bocoup.ATDriverGeneric", category: "service")
  let client = ATDriverClientUnix()

  deinit {
    do {
      try client.sendGoodbyeEvent()
    } catch {
      logger.error("error sending goodbye event: \(String(reflecting: error), privacy: .public)")
    }
  }

  @objc func postInitEvent() {
    logger.log("received init event")
    do {
      try client.sendInitEvent()
    } catch {
      logger.error("error sending init event: \(String(reflecting: error), privacy: .public)")
    }
  }

  @objc func postSpeechEvent(speech: String) {
    logger.log("received speech event")
    do {
      try client.sendSpeechEvent(speech: speech)
    } catch {
      logger.error("error sending speech event: \(String(reflecting: error), privacy: .public)")
    }
  }

  @objc func postCancelEvent() {
    logger.log("received cancel event")
    do {
      try client.sendCancelEvent()
    } catch {
      logger.error("error sending cancel event: \(String(reflecting: error), privacy: .public)")
    }
  }
}
