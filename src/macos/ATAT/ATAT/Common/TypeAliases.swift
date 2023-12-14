//
//  TypeAliases.swift
//  ATAT
//
//  Created by Z Goddard on 4/11/23.
//

import AudioToolbox
import CoreMIDI

#if os(iOS)
  import UIKit
  public typealias KitColor = UIColor

  public typealias KitView = UIView
  public typealias ViewController = UIViewController
#elseif os(macOS)
  import AppKit
  public typealias KitColor = NSColor

  public typealias KitView = NSView
  public typealias ViewController = NSViewController
#endif
