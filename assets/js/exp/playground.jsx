/* global GoTmplRender */

import { h, Component, render } from 'preact';

/**
 * Playground provides a template rendering capability for Go templates.
 */
class Playground extends Component {
  constructor() {
    super();
    this.state = {
      template: 'Hello, {{ .Name }}!',
      data: JSON.stringify({ Name: 'World' }),
      rendered: '',
    };
  }

  updateTemplate = (e) => {
    this.setState((prev) => Object.assign(prev, { template: e.target.value }));
  };

  updateData = (e) => {
    this.setState((prev) => Object.assign(prev, { data: e.target.value }));
  };

  generate = () => {
    this.setState((prev) =>
      Object.assign(prev, { rendered: GoTmplRender(prev.template, prev.data) })
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
              rows="5"
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
              rows="5"
              disabled="true"
            />
          </div>
          <button
            id="renderBtn"
            type="button"
            class="btn btn-primary"
            onClick={this.generate}
          >
            Render
          </button>
        </div>
      </div>
    );
  }
}

/**
 * main initializes the playground application.
 */
function main() {
  render(<Playground />, document.getElementById('app'));
}

main();
