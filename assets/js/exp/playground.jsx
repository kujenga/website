/* global Go, ExpRenderGoTemplate */

import { h, Component, render } from 'preact';

const Defaults = {
  template: 'Hello, {{ .Name }}!',
  data: JSON.stringify({ Name: 'World' }, null, '  '),
  autoRender: true,
};

/**
 * Playground provides a template rendering capability for Go templates.
 */
class Playground extends Component {
  constructor() {
    super();
    this.state = this.newState({}, Defaults, true);
  }

  /**
   * newState augments the passed in state values with rendering logic.
   *
   * @param {object} prev - Previous state values.
   * @param {object} s - New state values.
   * @param {boolean} forceRender - Set to true to force rendering.
   * @returns {object} - Complete new state value to pass to setState.
   */
  newState(prev, s, forceRender = false) {
    if (forceRender || this.state.autoRender) {
      s.rendered = ExpRenderGoTemplate(
        s.template || prev.template,
        s.data || prev.data
      );
    }
    return Object.assign(prev, s);
  }

  updateTemplate = (e) => {
    this.setState((prev) => this.newState(prev, { template: e.target.value }));
  };

  updateData = (e) => {
    this.setState((prev) => this.newState(prev, { data: e.target.value }));
  };

  updateRendered = () => {
    this.setState((prev) => this.newState(prev, {}, true));
  };

  setDefaults = () => {
    this.setState((prev) => this.newState(prev, Defaults, true));
  };

  toggleAutoRender = () => {
    this.setState((prev) =>
      Object.assign(prev, {
        autoRender: !this.state.autoRender,
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
              class="form-control mono"
              id="templateTextArea"
              value={state.template}
              onInput={this.updateTemplate}
              rows="12"
              autocomplete="off"
            />
          </div>
          <div class="form-group">
            <label for="dataTextArea">Data (JSON)</label>
            <textarea
              class="form-control mono"
              id="dataTextArea"
              value={state.data}
              onInput={this.updateData}
              rows="6"
              autocomplete="off"
            />
          </div>
        </div>
        <div class="col">
          <div class="form-group">
            <label for="renderTextArea">Rendered</label>
            <textarea
              class="form-control mono"
              id="renderTextArea"
              value={state.rendered}
              rows="12"
              disabled="true"
            />
          </div>
          <div class="form-group">
            <label>Configuration</label>
            <div class="form-inline">
              <button
                type="submit"
                class="btn btn-primary"
                disabled={state.autoRender}
                onClick={this.updateRendered}
              >
                Render
              </button>
              <div class="custom-control custom-switch ml-3">
                <input
                  type="checkbox"
                  class="custom-control-input"
                  id="autoRender"
                  checked={state.autoRender}
                  onClick={this.toggleAutoRender}
                />
                <label class="custom-control-label" for="autoRender">
                  Auto-render
                </label>
              </div>
            </div>
            <div class="form-inline mt-2">
              <button
                type="button"
                class="btn btn-secondary"
                onClick={this.setDefaults}
              >
                Restore Defaults
              </button>
            </div>
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
