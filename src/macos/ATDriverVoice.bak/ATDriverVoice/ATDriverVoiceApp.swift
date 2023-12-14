//
//  ATDriverVoiceApp.swift
//  ATDriverVoice
//
//  Created by Z Goddard on 4/3/23.
//

import CoreMIDI
import SwiftUI

@main
class ATDriverVoiceApp: App {
  @ObservedObject private var hostModel = AudioUnitHostModel()

  required init() {}

  var body: some Scene {
    WindowGroup {
      ContentView(hostModel: hostModel)
    }
  }
}
