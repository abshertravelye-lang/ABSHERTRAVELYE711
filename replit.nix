{ pkgs ? import <nixpkgs> {} }:
{
  deps = [
    pkgs.nodejs-18_x
    # Flutter in Nixpkgs may be experimental on Replit; if unavailable, remove the flutter line
    pkgs.flutter
  ];
}
