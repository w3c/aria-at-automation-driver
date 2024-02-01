//
//  ATDriverGenericServiceProtocol.swift
//  ATDriverGenericService
//
//  Created by Z Goddard on 12/20/23.
//

import Foundation

@objc protocol ATDriverGenericServiceProtocol {
  func postInitEvent()
  func postSpeechEvent(speech: String)
  func postCancelEvent()
}
