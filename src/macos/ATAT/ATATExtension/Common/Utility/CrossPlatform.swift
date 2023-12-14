//
//  CrossPlatform.swift
//  ATATExtension
//
//  Created by Z Goddard on 4/11/23.
//

import Foundation
import SwiftUI

#if os(iOS)
  typealias HostingController = UIHostingController
#elseif os(macOS)
  typealias HostingController = NSHostingController

  extension NSView {

    func bringSubviewToFront(_ view: NSView) {
      // This function is a no-opp for macOS
    }
  }
#endif
