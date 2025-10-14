package com.facebook.react;

import com.facebook.react.shell.MainReactPackage;
import java.util.ArrayList;
import java.util.List;

public class PackageList {
  private final ReactNativeHost mReactNativeHost;

  public PackageList(ReactNativeHost reactNativeHost) {
    mReactNativeHost = reactNativeHost;
  }

  public ArrayList<ReactPackage> getPackages() {
    ArrayList<ReactPackage> packages = new ArrayList<>();
    // Add the main React Native package
    packages.add(new MainReactPackage());
    // Add any other packages your app needs here
    return packages;
  }
}