//
//  AudioUnitFactory.swift
//  ATVSExtension
//
//  Created by Z Goddard on 4/12/23.
//

import CoreAudioKit
import os

private let log = Logger(subsystem: "com.bundle.id.ATVSExtension", category: "AudioUnitFactory")

public class AudioUnitFactory: NSObject, AUAudioUnitFactory {
  var auAudioUnit: AUAudioUnit?

  private var observation: NSKeyValueObservation?

  public func beginRequest(with context: NSExtensionContext) {

  }

  @objc
  public func createAudioUnit(with componentDescription: AudioComponentDescription) throws
    -> AUAudioUnit
  {
    auAudioUnit = try ATVSExtensionAudioUnit(
      componentDescription: componentDescription, options: [])

    guard let audioUnit = auAudioUnit as? ATVSExtensionAudioUnit else {
      fatalError("Failed to create ATVSExtension")
    }

    audioUnit.setupParameterTree(ATVSExtensionParameterSpecs.createAUParameterTree())

    self.observation = audioUnit.observe(\.allParameterValues, options: [.new]) { object, change in
      guard let tree = audioUnit.parameterTree else { return }

      // This insures the Audio Unit gets initial values from the host.
      for param in tree.allParameters { param.value = param.value }
    }

    return audioUnit
  }

}
