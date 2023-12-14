//
//  ATDriverGenericMacOSApp.swift
//  ATDriverGenericMacOS
//
//  Created by Z Goddard on 12/14/23.
//

import CoreMIDI
import SwiftUI

@main
class ATDriverGenericMacOSApp: App {
    @ObservedObject private var hostModel = AudioUnitHostModel()

    required init() {}

    var body: some Scene {
        WindowGroup {
            ContentView(hostModel: hostModel)
        }
    }
}
