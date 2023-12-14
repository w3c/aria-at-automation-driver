//
//  MyInstallerPane.m
//  Voice Installer
//
//  Created by Z Goddard on 4/11/23.
//

#import "MyInstallerPane.h"

@implementation MyInstallerPane

- (NSString *)title
{
    return [[NSBundle bundleForClass:[self class]] localizedStringForKey:@"PaneTitle" value:nil table:nil];
}

@end
