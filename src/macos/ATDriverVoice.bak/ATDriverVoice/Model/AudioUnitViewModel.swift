//
//  AudioUnitViewModel.swift
//  ATDriverVoice
//
//  Created by Z Goddard on 4/3/23.
//

import AudioToolbox
import CoreAudioKit
import SwiftUI

struct AudioUnitViewModel {
  var showAudioControls: Bool = false
  var showMIDIContols: Bool = false
  var title: String = "-"
  var message: String = "No Audio Unit loaded.."
  var viewController: ViewController?
}
