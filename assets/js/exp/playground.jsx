/* global Go, ExpRenderGoTemplate */

import { h, Component, render } from 'preact';

/**
 * Playground provides a template rendering capability for Go templates.
 */
class Playground extends Component {
  constructor() {
    super();
    this.state = {
      template: 'Hello, {{ .Name }}!',
      data: JSON.stringify({ Name: 'World' }, null, '    '),
    };
    this.state.rendered = ExpRenderGoTemplate(
      this.state.template,
      this.state.data
    );
  }

  updateTemplate = (e) => {
    this.setState((prev) =>
      Object.assign(prev, {
        template: e.target.value,
        rendered: ExpRenderGoTemplate(e.target.value, prev.data),
      })
    );
  };

  updateData = (e) => {
    this.setState((prev) =>
      Object.assign(prev, {
        data: e.target.value,
        rendered: ExpRenderGoTemplate(prev.template, e.target.value),
      })
    );
  };

  render(props, state) {
    return (
      <div class="row">
        <div class="col">
          <div class="form-group">
            <label for="templateTextArea">Template</label>
            <textarea
              class="form-control"
              id="templateTextArea"
              value={state.template}
              onInput={this.updateTemplate}
              rows="8"
              autocomplete="off"
            />
          </div>
          <div class="form-group">
            <label for="dataTextArea">Data (JSON)</label>
            <textarea
              class="form-control"
              id="dataTextArea"
              value={state.data}
              onInput={this.updateData}
              rows="5"
              autocomplete="off"
            />
          </div>
        </div>
        <div class="col">
          <div class="form-group">
            <label for="renderTextArea">Rendered</label>
            <textarea
              class="form-control"
              id="renderTextArea"
              value={state.rendered}
              rows="16"
              disabled="true"
            />
          </div>
        </div>
      </div>
    );
  }
}

/**
 * main initializes the playground application.
 */
function main() {
  // Getch the WASM file and stream it into the page. Once that is complete, we
  // render the Playground application.
  // https://golangbot.com/webassembly-using-go/
  const go = new Go();
  WebAssembly.instantiateStreaming(
    fetch('/exp/playground.wasm'),
    go.importObject
  ).then((result) => {
    go.run(result.instance);

    render(<Playground />, document.getElementById('app'));
  });
}

main();
