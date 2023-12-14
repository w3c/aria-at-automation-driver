//
//  ATVSExtensionAudioUnit.swift
//  ATVSExtension
//
//  Created by Z Goddard on 4/12/23.
//

// NOTE:- An Audio Unit Speech Extension (ausp) is rendered offline, so it is safe to use
// Swift in this case. It is not recommended to use Swift in other AU types.

import AVFoundation

public class ATVSExtensionAudioUnit: AVSpeechSynthesisProviderAudioUnit {
  private var outputBus: AUAudioUnitBus
  private var _outputBusses: AUAudioUnitBusArray!

  private var request: AVSpeechSynthesisProviderRequest?

  private var format: AVAudioFormat

  private var linearGain = AUValue(0.0)

  @objc override init(
    componentDescription: AudioComponentDescription, options: AudioComponentInstantiationOptions
  ) throws {
    let basicDescription = AudioStreamBasicDescription(
      mSampleRate: 22050.0,
      mFormatID: kAudioFormatLinearPCM,
      mFormatFlags: kAudioFormatFlagsNativeFloatPacked | kAudioFormatFlagIsNonInterleaved,
      mBytesPerPacket: 4,
      mFramesPerPacket: 1,
      mBytesPerFrame: 4,
      mChannelsPerFrame: 1,
      mBitsPerChannel: 32,
      mReserved: 0)

    self.format = AVAudioFormat(
      cmAudioFormatDescription: try! CMAudioFormatDescription(
        audioStreamBasicDescription: basicDescription))

    outputBus = try AUAudioUnitBus(format: self.format)
    try super.init(componentDescription: componentDescription, options: options)
    _outputBusses = AUAudioUnitBusArray(
      audioUnit: self, busType: AUAudioUnitBusType.output, busses: [outputBus])
  }

  public override var outputBusses: AUAudioUnitBusArray {
    return _outputBusses
  }

  public override func allocateRenderResources() throws {
    try super.allocateRenderResources()
  }

  public func setupParameterTree(_ parameterTree: AUParameterTree) {
    self.parameterTree = parameterTree

    // Set the Parameter default values before setting up the parameter callbacks
    for param in parameterTree.allParameters {
      setParameter(paramAddress: param.address, value: param.value)
    }

    setupParameterCallbacks()
  }

  private func setupParameterCallbacks() {
    // implementorValueObserver is called when a parameter changes value.
    parameterTree?.implementorValueObserver = { [weak self] param, value -> Void in
      self?.setParameter(paramAddress: param.address, value: value)
    }

    // implementorValueProvider is called when the value needs to be refreshed.
    parameterTree?.implementorValueProvider = { [weak self] param in
      return self!.getParameter(param.address)
    }

    // A function to provide string representations of parameter values.
    parameterTree?.implementorStringFromValueCallback = { param, valuePtr in
      guard let value = valuePtr?.pointee else {
        return "-"
      }
      return NSString.localizedStringWithFormat("%.f", value) as String
    }
  }

  // MARK:- Parameter Setter / Getter
  func setParameter(paramAddress: AUParameterAddress, value: AUValue) {
    switch paramAddress {
    case ATVSExtensionParameterAddress.gain.rawValue:
      linearGain = value
    default:
      return
    }
  }

  func getParameter(_ paramAddress: AUParameterAddress) -> AUValue {
    switch paramAddress {
    case ATVSExtensionParameterAddress.gain.rawValue:
      return linearGain
    default:
      return 0.0
    }
  }

  // MARK:- Rendering
  /*
	 NOTE:- It is only safe to use Swift for audio rendering in this case, as Audio Unit Speech Extensions process offline.
	 (Swift is not usually recommended for processing on the realtime audio thread)
	 */
  public override var internalRenderBlock: AUInternalRenderBlock {
    return { actionFlags, timestamp, frameCount, outputBusNumber, outputAudioBufferList, _, _ in
      // this is the audio buffer we are going to fill up
      let unsafeBuffer = UnsafeMutableAudioBufferListPointer(outputAudioBufferList)[0]
      let frames = unsafeBuffer.mData!.assumingMemoryBound(to: Float32.self)

      for frame in 0..<frameCount {
        frames[Int(frame)] = 0.0
      }

      actionFlags.pointee = .offlineUnitRenderAction_Complete

      return noErr

    }
  }

  public override func synthesizeSpeechRequest(_ speechRequest: AVSpeechSynthesisProviderRequest) {
    self.request = speechRequest
  }

  public override func cancelSpeechRequest() {
    self.request = nil
    NSLog("Stop synthesizing")
  }

  public override var speechVoices: [AVSpeechSynthesisProviderVoice] {
    get {
      return [
        AVSpeechSynthesisProviderVoice(
          name: "ATVSExtensionVoice", identifier: "ATVSExtension", primaryLanguages: ["en-US"],
          supportedLanguages: ["en-US"])
      ]
    }
    set {}
  }

}
