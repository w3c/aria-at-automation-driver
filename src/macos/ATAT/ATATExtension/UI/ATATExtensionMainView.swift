//
//  ATATExtensionMainView.swift
//  ATATExtension
//
//  Created by Z Goddard on 4/11/23.
//

import SwiftUI

struct ATATExtensionMainView: View {
  var parameterTree: ObservableAUParameterGroup

  var body: some View {
    ParameterSlider(param: parameterTree.global.gain)
  }
}
