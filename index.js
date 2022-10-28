function isPercentage(flt) {
  return !isNaN(flt) && flt >= 0 && flt <= 100;
}

const percentageRegex = /^[0-9]{0,2}(\.[0-9]+)?$/
function isPercentageString(str) {
  return percentageRegex.test(str)
}

class PercentageInput {
  #elt

  constructor(elt) {
    this.#elt = elt;
  }

  get value() {
    const flt = parseFloat(this.#elt.value);
    return isPercentage(flt) ? flt : undefined;
  }

  set value(newValue) {
    this.#elt.value = newValue.toString();
  }

  onChange(cb) {
    this.#elt.addEventListener('input', e => {
      if (!isPercentageString(e.target.value)) return;
      cb(parseFloat(e.target.value));
    });
  }
}

class PercentageVariable {
  #elt
  #inputs

  constructor(id, container=document) {
    this.#elt = container.querySelector(`.percentage-variable#${id}`);
    this.#inputs = Array.from(this.#elt.querySelectorAll('input')).
      map(elt => new PercentageInput(elt));
    this.#sync();
  }

  get value() {
    var flt;
    for (const input of this.#inputs) {
      if (flt = input.value) return flt;
    }
  }

  set value(newValue) {
    for (const input of this.#inputs) {
      input.value = newValue;
    }
  }

  #sync() {
    for (const input of this.#inputs) {
      input.onChange(newValue => this.value = newValue);
    }
  }

  onChange(cb) {
    for (const input of this.#inputs) {
      input.onChange(cb);
    }
  }
}

class TernaryVariable {
  #elt
  #inputs

  constructor(id, container=document) {
    this.#elt = container.querySelector(`.ternary-variable#${id}`);
    this.#inputs = Array.from(this.#elt.querySelectorAll('input'));
  }

  get value() {
    return this.#inputs.find(i => i.checked).value;
  }

  set value(newValue) {
    this.#inputs.find(i => i.value == newValue).checked = true;
  }

  onChange(cb) {
    this.#elt.addEventListener('input', () => { cb(this.value) });
  }
}

class Result {
  #changeListeners
  #equation
  #parameterValues

  constructor(equation, ...parameters) {
    this.#changeListeners = [];
    this.#equation = equation;
    this.#parameterValues = [];

    for (const [i, parameter] of parameters.entries()) {
      this.#parameterValues[i] = parameter.value;
      parameter.onChange(newValue => {
        this.#parameterValues[i] = newValue;
        this.#updateValue();
        this.#didChange();
      });
    }

    this.#updateValue();
  }

  onChange(cb) {
    this.#changeListeners.push(cb);
  }

  display(elt) {
    elt.innerText = this.value.toFixed(2);
    this.onChange(newValue => elt.innerText = newValue.toFixed(2));
  }

  #updateValue() {
    this.value = this.#equation(...this.#parameterValues);
  }

  #didChange() {
    for (const cb of this.#changeListeners) {
      cb(this.value);
    }
  }
}

function syncSpanCount(elt, result) {
  const update = () => {
    const resultValue = result.value;

    while (elt.childElementCount < resultValue) {
      elt.appendChild(document.createElement('span'));
    }

    while (elt.childElementCount > resultValue) {
      elt.removeChild(elt.firstChild);
    }
  }

  result.onChange(update);
  update();
}

function truePositive (baseRate, sensitivity) { return        baseRate  *        sensitivity  / 100 }
function falseNegative(baseRate, sensitivity) { return        baseRate  * (100 - sensitivity) / 100 }
function falsePositive(baseRate, specificity) { return (100 - baseRate) * (100 - specificity) / 100 }
function trueNegative (baseRate, specificity) { return (100 - baseRate) *        specificity  / 100 }

function positivePredictiveValue(truePositive, falsePositive) { return 100 * truePositive / (truePositive + falsePositive) }
function negativePredictiveValue(trueNegative, falseNegative) { return 100 * trueNegative / (trueNegative + falseNegative) }

function conditionProbability(testResult, baseRate, positivePredictiveValue, negativePredictiveValue) {
  switch (testResult) {
    case 'unknown':
      return baseRate;
    case 'positive':
      return positivePredictiveValue;
    case 'negative':
      return 100 - negativePredictiveValue;
  }
}

function run() {
  const specificity = new PercentageVariable('specificity');
  const sensitivity = new PercentageVariable('sensitivity');
  const baseRate = new PercentageVariable('base-rate');
  const testResult = new TernaryVariable('test-result');

  const tp = new Result(truePositive, baseRate, sensitivity);
  const fn = new Result(falseNegative, baseRate, sensitivity);
  const fp = new Result(falsePositive, baseRate, specificity);
  const tn = new Result(trueNegative, baseRate, specificity);

  const ppv = new Result(positivePredictiveValue, tp, fp);
  const npv = new Result(negativePredictiveValue, tn, fn);

  const cp = new Result(conditionProbability, testResult, baseRate, ppv, npv);

  cp.display(document.querySelector('#condition-probability'));
  ppv.display(document.querySelector('#ppv'));
  npv.display(document.querySelector('#npv'));

  syncSpanCount(document.querySelector('#viz-tp'), tp);
  syncSpanCount(document.querySelector('#viz-fn'), fn);
  syncSpanCount(document.querySelector('#viz-fp'), fp);
  syncSpanCount(document.querySelector('#viz-tn'), tn);
}

if (document.readyState == 'complete') {
  run();
} else {
  window.addEventListener('DOMContentLoaded', run);
}