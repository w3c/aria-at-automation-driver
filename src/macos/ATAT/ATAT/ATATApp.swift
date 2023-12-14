//
//  ATATApp.swift
//  ATAT
//
//  Created by Z Goddard on 4/11/23.
//

import CoreMIDI
import SwiftUI

@main
class ATATApp: App {
  @ObservedObject private var hostModel = AudioUnitHostModel()

  required init() {}

  var body: some Scene {
    WindowGroup {
      ContentView(hostModel: hostModel)
    }
  }
}
