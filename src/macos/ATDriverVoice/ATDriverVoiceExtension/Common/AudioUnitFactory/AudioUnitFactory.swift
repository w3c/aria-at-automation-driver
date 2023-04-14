//
//  AudioUnitFactory.swift
//  ATDriverVoiceExtension
//
//  Created by Z Goddard on 4/12/23.
//

import CoreAudioKit
import os

private let log = Logger(
  subsystem: "com.bundle.id.ATDriverVoiceExtension", category: "AudioUnitFactory")

public class AudioUnitFactory: NSObject, AUAudioUnitFactory {
  var auAudioUnit: AUAudioUnit?

  private var observation: NSKeyValueObservation?

  public func beginRequest(with context: NSExtensionContext) {

  }

  @objc
  public func createAudioUnit(with componentDescription: AudioComponentDescription) throws
    -> AUAudioUnit
  {
    auAudioUnit = try ATDriverVoiceExtensionAudioUnit(
      componentDescription: componentDescription, options: [])

    guard let audioUnit = auAudioUnit as? ATDriverVoiceExtensionAudioUnit else {
      fatalError("Failed to create ATDriverVoiceExtension")
    }

    audioUnit.setupParameterTree(ATDriverVoiceExtensionParameterSpecs.createAUParameterTree())

    self.observation = audioUnit.observe(\.allParameterValues, options: [.new]) { object, change in
      guard let tree = audioUnit.parameterTree else { return }

      // This insures the Audio Unit gets initial values from the host.
      for param in tree.allParameters { param.value = param.value }
    }

    return audioUnit
  }

}
