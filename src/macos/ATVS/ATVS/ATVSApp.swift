//
//  ATVSApp.swift
//  ATVS
//
//  Created by Z Goddard on 4/12/23.
//

import CoreMIDI
import SwiftUI

@main
class ATVSApp: App {
  @ObservedObject private var hostModel = AudioUnitHostModel()

  required init() {}

  var body: some Scene {
    WindowGroup {
      ContentView(hostModel: hostModel)
    }
  }
}
