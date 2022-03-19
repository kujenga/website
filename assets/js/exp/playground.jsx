/* global ExpRenderGoTemplate, ExpConvertData */

import { h, Component } from 'preact';

const Format = {
  YAML: 'YAML',
  JSON: 'JSON',
};

const Defaults = {
  template: 'Hello, {{ .Name }}!',
  data: 'Name: World',
  dataFormat: Format.YAML,
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
        s.data || prev.data,
        s.dataFormat || prev.dataFormat
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

  updateDataFormat = (e) => {
    this.setState((prev) => {
      const newFormat = e.target.value;
      const newData = ExpConvertData(prev.data, prev.dataFormat, newFormat);
      return Object.assign(prev, {
        data: newData,
        dataFormat: newFormat,
      });
    });
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
            <div class="form-inline">
              <label for="dataTextArea">Data</label>
              <label class="sr-only" for="dataFormat">
                Format
              </label>
              <select
                class="custom-select custom-select-sm ml-2 mb-1"
                id="dataFormat"
                value={state.dataFormat}
                onChange={this.updateDataFormat}
              >
                {Object.keys(Format).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
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

export { Playground };
