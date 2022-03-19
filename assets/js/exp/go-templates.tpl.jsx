/* global Go */

import { h, Component, render } from 'preact';

import { Playground } from './playground';

/**
 * main initializes the playground application.
 */
function main() {
  // Getch the WASM file and stream it into the page. Once that is complete, we
  // render the Playground application.
  // https://golangbot.com/webassembly-using-go/
  const go = new Go();
  WebAssembly.instantiateStreaming(
    // Go template logic to pull in WASM file.
    // {{ $wasm := resources.Get "/js/exp/wasm/go-templates.wasm" | resources.Fingerprint "sha256" }}
    fetch('{{ $wasm.RelPermalink }}'),
    go.importObject
  ).then((result) => {
    go.run(result.instance);

    // TODO: Render first and then load WASM async, with a loading spinner until that time.
    render(<Playground />, document.getElementById('app'));
  });
}

main();
