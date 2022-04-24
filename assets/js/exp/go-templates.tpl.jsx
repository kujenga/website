/* global Go */

import { h, Component, render } from 'preact';

import { Playground } from './playground';

/**
 * main initializes the playground application.
 */
function main() {
  // Go template logic to pull in WASM file.
  // {{ $wasm := resources.Get "/js/exp/wasm/go-templates.wasm" | resources.Fingerprint "sha256" }}
  render(
    <Playground wasm="{{ $wasm.RelPermalink }}" />,
    document.getElementById('app')
  );
}

main();
