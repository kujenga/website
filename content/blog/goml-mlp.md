+++
date = "2021-11-22T07:32:55-05:00"
title = "Building a Neural Network in Go"
description = """
Creating a basic neural network from scratch, with just the Go standard library.
"""
categories = []
tags = []
mathjax = true
toc = true
+++

This post covers the creation of a basic neural network written in Go.
Specifically, we will be implementing a Multi-Layer Perceptron (MLP), walking
through how this mechanism works and then walk through the creation of this
network in Go. Our goal is to create a network that performs well on the MNIST
dataset, which measures performance at recognizing handwritten digits.

While there are a number of resources out there that will cover either the
implementation of basic single layer networks, or the the concepts and math
behind neural networks generally, there seems to be scant resources available
covering both concept and implementation of multi-layer networks, particularly
in a way that goes into the details of backpropagation and structuring it in a
way that is flexible enough for a variety of use cases. My goal here is to walk
through the creation what's needed to create a neural network by creating it in
Go using just the standard library, so that everything needed to create the
network is right in the package we will be implementing.

While we will be implementing the network from scratch, I'll be linking out to
other fantastic resources out there that can provide further detail on the
various implementation aspects if the network, including deeper walkthroughs of
the concepts and intuition behind neural networks and more detailed walkthroughs
for deriving back-propagation.

The network that is created over the course of this post can be found here:
[github.com/kujenga/goml][repo]

## What is a neural network?

Neural networks are a machine learning system that is modeled after a basic
understanding of the human brain. They operate as a series of neurons, most
commonly organized in layers, that perform basic compute functions and based on
inputs, and pass on their outputs to other neurons in the network. The network
as a whole takes in a set of inputs and produces a set of outputs, the result of
the values passing through the network neurons.

A single-layer [Perceptron][perceptronWiki] is the simplest useful network, the
idea for which was first introduced in 1958(!). It can solve basic linearly
separable problems, meaning that you could draw straight line(s) to bisect the
differen categories in the output.

The following diagram illustrates the basic structure of a single-layer
perceptron. Inputs come in on the left-hand side of the network, are passed to
the next layer via the edges represented with directional lines, and are passed
into the output nodes that represent the predictions of the network. As we're
looking at this diagram, one thing to note is that the real magic of the network
is mostly all in the edges themselves. The nodes within the input layer
basically just relay values into the network, and the method by which we
propagate those values to the following layers is where the actual computation
happens.

{{< img 3-single-layer-perceptron.png "Single Layer Perceptron" >}}

Each of the nodes in the above graph is often referred to as a "neuron", as they
are intended to roughly mimic the structures within a simplified model of the
brain. Let's dive a bit deeper into how those function at a high level. We will
cover each of these in detail throughout this post.

1. Define a weight parameter \\(w_{i,j}^{L}\\) for each edge in the network for each
   layer \\(L\\).
1. For each node in the next layer, take the sum of the inputs from the prior
   layer, multiplied by the weights on each corresponding edge.
1. Add a bias to the weighted value.
1. Apply an “activation function” to the sum.
1. Pass the result to the next layer.

{{< img 4-basic-neuron-operation.png "Basic Neuron Operation" >}}

### Activation Functions

A key element of the above diagram is the activation function that modifies the
summation of the incoming values and weights. Activation functions are
non-linear functions that transform these values in a way that gives the network
more expressive power. Without their addition of a non-linear component in the
network, we just have a series of linear transformations, which limits the types
of problems we can solve.

This diagram shows the Logistic activation function, also known as sigmoid,
which is what we will be using in our network implementation. The output is
represented in the y axis and the input on the x axis. The smoothing of more
extreme input values is critical to the learning ability of the network.

{{< img "Logistic-curve.svg" "Logistic Curve" >}}

> By Qef (talk) - Created from scratch with gnuplot, Public Domain,
> https://commons.wikimedia.org/w/index.php?curid=4310325

To make this network morecapable, we can extend the model of a single-layer
perceptron by adding more layers, creating a multi-layer perceptron. The number
and size of layers in this network are defined as the "network architecture",
and such configurations are often referred to as "hyperparameters". As in the
single-layer example, the first layer in the network is termed out "input"
layer, and the last layer in the network is termed our "output" layer. The new
interior layers are commonly referred to as "hidden" layers, as they are
internal to the network.

More layers add capabilities to the network, facilitating the handling of much
more complex use cases for the network, and will be instrumental in tackling the
MNIST dataset.

In the rest of this post, we will build out an implementation of this network
that is flexible with respect to the network architecture, allowing for an
artibtrary number of layers at arbitrary sizes.

{{< img "6-multi-layer-preceptron.png" "Multi-layer Perceptron" >}}

## Let's build

As we mentioned in the intro, at their most basic level, neural networks take in
a set of inputs and produce a set of outputs. In the process of constructing a
network, we can center our development around a basic set of unit tests that
emulate this behavior. We'll use two basic classes of tests, one to verify our
ability learn the outputs of common boolean functions, and then later on we'll
add test cases to train and predict on the MNIST dataset.

### Boolean test cases

Here is an example of the basic test cases we will build on for the boolean
inputs and the corresponding output labels that different instantiations of the
network can learn.

{{< emgithub "https://github.com/kujenga/goml/blob/0fc9ceb246d1bf1e1104f576b4622a824bf013da/neural/mlp_test.go#L34-L58" >}}

### MNIST test cases

In contrast to these examples of replicating basic boolean logic, the MNIST
dataset is a real machine learning problem, where you must learn to predict the
hand-written digit between 0-9 for a given input image. This dataset is a great
example of where a basic neural network performs well relative to other
approaches.

One caveat here is that the MNIST dataset is in a unique format, which we will
need to deserialize in order to make use of it in a test case. We will walk
through that later in the post.

{{< img "MnistExamples.png" "MNIST Examples" >}}

> Josef Steppan, CC BY-SA 4.0 <https://creativecommons.org/licenses/by-sa/4.0>, via Wikimedia Commons

## Making predictions: Implementing Feed-forward

As we think about how to structure the code for our network, there are a few key
pieces of functionality we need to provide:
- Initialize the network, allocating the needed data structures and initial
  values.
- Train the network, iteratively improving the network output based on inputs.
- Make predictions using the trained network, taking a set of inputs and
  providing an inferenced output.

In addition to these basic functionalities, we also want to build it in a
flexible manner that can facilitate any number of layers, so that we can create
networks of different architectures in the future, with an eye towards future
iterations into more complex types neural networks, a possible topic for future
posts.

For this implementation we will favor clarity over optimizations, aligned with
the goal of this project as a way to learn the details of how networks operate.

### Code structure

The primary struct controlling our network is the `MLP` struct, representing our
Multi-Layer Perceptron, and is fairly simple. It holds an array of layers
which form the structure of the network and hold state for training and
prediction. The `LearningRate` variable is a network-level hyperparameter
controlling the training process, and the `Introspect` function allows us to
look at incremental training progress.

{{< emgithub "https://github.com/kujenga/goml/blob/fc6bc437686cf50dc0ba9f3bb7f7e7ee23bc611d/neural/mlp.go#L21-L39" >}}

Diving deeper into the implementation, the `Layer` struct represents a single
layer within the network. Here things start to get more complex, as there is
quite a bit of state that needs to be managed to facilitate the training
process.

The key elements to capture within this data structure are:
- Parameters that define the layer behavior, including the width of the network
  and the "activation function".
- Internal references to the network itself, as well as the next and previous
  layers in the network. We need references in both directions to facilitate
  forward and backward propagation.
- Internal state values of the layer, holding the weights and biases. We'll look
  at how these are used more closely in the next section.
- Records of the internal activation values that the layer had last seen. These
  need to be captured for use in the backpropagation training process.

{{<emgithub "https://github.com/kujenga/goml/blob/fc6bc437686cf50dc0ba9f3bb7f7e7ee23bc611d/neural/mlp.go#L156-L198" >}}

With these two structures defined, we can look at how the training process
works. The entrypoint is the `Train` function which iterates for a given number
of "epochs". Training happens iteratively, with each step containing two passes.

For each input, we first propagate the weights and subsqeuent layer outputs
forward through the network to get the current predictions of the network for
the given input. Once that is complete, we propagate the error values we compute
based on the corresponding labels _backwards_ though the network, and update the
weights in the direction that looks like it will reduce the error we saw for
that input.

{{<emgithub "https://github.com/kujenga/goml/blob/fc6bc437686cf50dc0ba9f3bb7f7e7ee23bc611d/neural/mlp.go#L70-L123" >}}

Once the network is trained, we can use it for making predictions! There is some
neat symmetry in the implementation here, as the `Predict` function is identical
to the first part of the inner loop of the `Train` function where we are
propagate our inputs forwards through the network.

{{<emgithub "https://github.com/kujenga/goml/blob/fc6bc437686cf50dc0ba9f3bb7f7e7ee23bc611d/neural/mlp.go#L125-L140" >}}

One note on this approach is that the `float32` type was chosen as full float64
precision isn't needed here. Manh state of the art ML platforms are using even
lower precision for increased memory efficient, as well as "mixed precision"
schemes[^mixedPrecision] that combine multiple precision levels. When Go adds
support for generics[^goGenerics] that could be something made parameterizable.

## Forward Propagation: Making predictions

We will now be implementing this forward propagation step, where we transform a
set of inputs passed into this network into a set of outputs.

One thing I have found confusing in some portrayals of neural networks is that
so much of the focus on the "neurons" themselves, represented as nodes in the
network graph. The real magic is all in the edges! The weights attached to the
edges, the activation function that they pass through, and the bias values
shifting the output, are what give these networks their power. The nodes
themselves are just representations of state, which is what this diagram
attempts to show:

{{< img 4-basic-neuron-operation.png "Basic Neuron Operation" >}}

With that in mind, we iterate through each input value we are recieving from the
last layer and calculate the activations. This is skipped for the input layer,
since it is just recieving the raw values into the network. The combination of
the weights and input values into a single value is most clearly expressed as a
dot-product, and the `Z` value is used to record the linear combination of the
weights with the bias added in before the activation function. Both this `Z`
value and the activation value itself are stored, not for use in the forward
propagation, but for use later in the backpropagation process.

{{< emgithub "https://github.com/kujenga/goml/blob/b73f6122025613f0ffe91033a959b8d0093baab4/neural/mlp.go#L247-L268" >}}

## Backpropagation: Training the network

Being able to compute a set of outputs given a set of inputs is great, but in
order to give meaning to these outputs, we need to train the network to give it
the behavior that we expect. The way most all machine learning models are
trained is through a series of iterative steps, where each step tweaks the
parameters of the model a way that decreases the "loss" of the network, and
we'll be doing that same process here.

In each of those iterative steps, our goal is to update the parameters in the
network, primarily the weights and biases, to minimize the error. Moving
backwards through this three layer network to do that, our conceptual steps
corresponding to the diagram below are:
1. Compute the error at the output layer, comparing output activations vs. the
   provided labels.
1. Update the weights in a way that will decrease the computed error.
1. Propagate the error backwards through the network in order to repeat the
   process of weight updates.
1. Update the next set of weights to minimize propagation error from that
   earlier layer.

{{< img "20-backprop-overall.png" "Backpropagation Overview" >}}

If this still isn't totally clear and you'd like to go into more depth with
understanding the intuition behind backpropagation, watch this video!
[Backpropagation explained | Part 1 - The
intuition][deeplizardBackPropIntuition]

### Introducing Loss Functions

In the above diagram, we talk about propagating the "error" back through the
network. This presents a slight hiccup however, as the simplest way to calculate
error values, the difference between the expected labeled output and the output
we recieved from the network, can be either a positive or negative value. In
order to determine how well the network is doing, we need to be able to look at
the aggregate of these errors. We do this using a Loss Function, which
transforms the raw error from the network into something more mathematically
useful to us.

For our network, we will be using the Mean Squared Error (MSE) loss function,
which is just what it sounds like, taking the average of the squared values from
each output, so that the summed errors in the average always correctly indicate
that the network is doing better or worse and there is no cancellation. The
formula for MSE is as follows:

<!-- LaTex rendered by MathJax -->
<div>
$$\frac{1}{N} \sum_{i=1}^N (labels_{i} - outputs_{i})^2$$
</div>

There are all sorts of different loss function with varying properties which can
be used as well. More can be read about different loss functions in other
resources around the web [^lossFunctions].

### Understanding Gradient Descent

Now that we have the basic concepts of propagating error values back through the
network to update parameters and using loss functions to calculate how well (or
poorly) the network is doing, we can apply this process repeatedly to
iteratively improve our network's performance. That iterative process is known
as [Gradient Descent][gradientDescentWiki].

Conceptually, this gradient can be thought of as a hilly landscape, which we
represent here from the top in two dimensions. The vertical axis represents the
loss, where lower is better, and the horizontal access represents the space of
possible parameters that we can move around within as we look for the point to
minimize this loss. In reality, the number dimensions in this graph is the same
as the number of parameters we are trying to tweak, but this conceptual
understanding remains valid as the model scales.

In the training process, the goal is to find the point in this landscape that minimizes the loss for the inputs that we care about.

{{< img "Gradient_descent.svg" "Gradient Descent" >}}
<!-- https://en.wikipedia.org/wiki/Gradient_descent#/media/File:Gradient_descent.svg -->

There are a few different approaches to Gradient Descent, but the one we will be
starting off with here is the simplest, called Stochastic Gradient Descent
(SGD). With SGD, you look at one input at a time and update the network based on
the loss from that input/label pair. Other types of gradient descent such as
batch and mini-batch look at multiple inputs and label pairs at a time, which
can have various advantages[^gradientDescentTypes], but introduce complexity as
well, so we skip those for the scope of this post.

### Backpropagation in more detail

To get into the details of what our backpropgation implementation will actually
look like, first we look at a single layer, going from the outputs back to the
inputs from the previous. The basic steps for this are:

1. Labels are used to compute errors in the output, transformed using loss
   function.
1. Those errors are used to inform updates to teh the weight and bias parameters
   in a way that would have decreased the computed error.

This is equivalent to the first back-propagation step in Multi-layer backpropagation.

{{< img "22-backprop-single-layer.png" "Backpropagation in a Single Layer" >}}

In order to extend this to multiple layers within the whole network, we
simply propagate error values back another layer. For each node in the previous
layer, we use the dot product of the errors and the weights on the corresponding
edges, which has a sort of symmertry with how the outputs were computed in the
first place.

{{< img "23-backprop-multi-layer.png" "Backpropagation in Multiple Layers" >}}

### Calculating with Calculus

So, being able to iteratively walk down hill in our loss landscape and update
weights to move towards a better and better network sounds great, but how do we
actually go about finding what that landscape actually looks like and which
direction to move in? All the feed-forward process implementation we have looked
at so far gives us is our current location in the loss landscape. This is where
derivatives come into play, allowing us to compute a closed form solution for
updating the weights for a given set of errors.

To capture all of our formulas in one place, here are the three equations that
will be differentiated.

<!-- LaTex rendered by MathJax -->
<div>
$$Z = Weights \cdot Inputs + Biases$$
$$Activations = f_{activation}(Z)$$
$$Loss = \frac{1}{N} \sum_{i=1}^N (labels_{i} - outputs_{i})^2$$
</div>

Based on these equations, we use the chain rule to expand the derivative of the
loss with respect to weights out into a series of functions we can compute. For
a fantastic explaination of this differentiation process in more detail, watch:
[Backpropagation explained | Part 4 - Calculating the
gradient][deeplizardBackPropGradient] as well as preceeding videos in that
series. To cover this briefly, the derivatives that we wish to compute are as
follows.

For updating the _weights_, we need to compute the derivative of the loss with
respect to the derivative of the weights. In other words, how to we change the
weights to decrease the loss?

<!-- LaTex rendered by MathJax -->
<!-- ∂L/∂w = ∂L/∂a * ∂a/∂z * ∂z/∂w -->
<div>
$$
\frac{\partial Loss}{\partial Weights} =
\frac{\partial Loss}{\partial Activations} *
\frac{\partial Activations}{\partial Z} *
\frac{\partial Z}{\partial Weights}
$$
</div>

For updating the _bias_, we calculate the derivative of the loss with respect to
the derivative of the inner \\(Z\\) value, which is directly influenced by the
bias. In other words, how do we shift the values to decrease the loss?

<!-- LaTex rendered by MathJax -->
<!-- ∂L/∂z = ∂L/∂a * ∂a/∂z -->
<div>
$$
\frac{\partial Loss}{\partial Z} =
\frac{\partial Loss}{\partial Activations} *
\frac{\partial Activations}{\partial Z}
$$
</div>

#### Calculating the derivative

Armed with these new equations, we can implement each component of these partial
derivatives to be combined for the final weight and bias updates.

Via the [Power Rule][powerRule] on the MSE function, we have the following
result for the first component.

<div>
$$\frac{\partial Loss}{\partial Activations} = 2 * Error$$
</div>

<!-- ∂L/∂a -->
{{< emgithub "https://github.com/kujenga/goml/blob/fc6bc437686cf50dc0ba9f3bb7f7e7ee23bc611d/neural/mlp.go#L274-L292" >}}

For the derivative of the activations w.r.t. the intermediate Z values, we
simply take the derivative of the activation function.

<div>
$$\frac{\partial Activations}{\partial Z} = f_{activation}^{'}(Z)$$
</div>

As this is a configurable "hyperparameter" of the network, it is a pre-defined
value that needs to be specified at network initialization. In our test cases
outlined further below, the value is \\(sigmoid^{'}(Z)\\).

<!-- ∂a/∂z -->
{{< emgithub "https://github.com/kujenga/goml/blob/fc6bc437686cf50dc0ba9f3bb7f7e7ee23bc611d/neural/mlp.go#L294-L296" >}}

Lastly, we have the derivative of the Z values with respect to the weights,
which simply comes out to the activation values from the previous layer.

<div>
$$\frac{\partial Z}{\partial Weights} = Activations$$
</div>

<!-- ∂z/∂w -->
{{< emgithub "https://github.com/kujenga/goml/blob/fc6bc437686cf50dc0ba9f3bb7f7e7ee23bc611d/neural/mlp.go#L306-L308" >}}

Now that we have the components, we can combine them per the original equation
for our partial derivative that we arrived at via the chain rule. using these
combined values, we update both the weights and the biases accordingly,
multiplied by our _learning rate_, which is critical to the success of these
iterations as we will see next.

{{< emgithub "https://github.com/kujenga/goml/blob/fc6bc437686cf50dc0ba9f3bb7f7e7ee23bc611d/neural/mlp.go#L310-L322" >}}

### Why learning rate matters

When we calculate the derivative for a given point in the loss landscape, we
need to make sure we are not overly trusting of what it tells us. Looking again
at this diagram from earlier, we _could_ use the inferred slope of the loss from
the computed gradient at a given point to attempt to jump straight to the values
that will set the loss to zero along that plane within the gradient. As we can
see here though, that would overshoot our desired minimized loss value and
bounce around more than is desired. Continuing in that process would prevent us
from reaching the minimum point where error is most greatly reduced, because
with every step we are likely to overshoot it.

In this diagram, the use of a learning rate is shown through the smaller
iterations on the thinner light red lines, where we move by a few percentage
points of the amount predicted by the gradient to get closer and closer to the
minima iteratively.

{{< img "27-learning-rate-matters.png" "Why learning rate matters" >}}

With these pieces in place, we are now ready to start testing our network!

## Boolean test cases

To re-iterate from above, the basic set of test cases we are targeting are to
see if our network can learn basic boolean logic. We have test cases
representing three models we want to train:
- Boolean MUST
- Boolean AND
- Boolean OR

Each set of labels will be used to train a different network, and the tests will
be setup and executed in a repeated table-driven style with the following cases:

{{< emgithub "https://github.com/kujenga/goml/blob/fc6bc437686cf50dc0ba9f3bb7f7e7ee23bc611d/neural/mlp_test.go#L80-L100" >}}

First we set up a basic MLP network to test against with just an input layer and
single output layer with weights doing computation.

We iterate over the boolean test cases and assert that the network can learn the
outputs in each case.

{{< emgithub "https://github.com/kujenga/goml/blob/b73f6122025613f0ffe91033a959b8d0093baab4/neural/mlp_test.go#L152-L179" >}}

A test case for the multi-layer network it set up the same way, just adding in a
hidden layer to the network.

{{< emgithub "https://github.com/kujenga/goml/blob/b73f6122025613f0ffe91033a959b8d0093baab4/neural/mlp_test.go#L209-L238" >}}

The `predictionTestBool` function is a simple helper that asserts that the
output of the network always matches the output of the labeled data for the
corresponding boolean function.

Below is the output of these tests (with the `Introspect` function ommitted). We
can observe how the predictions trend toward the correct labels. The assertions
in the test verify this, using fuzzy mathing logic with cutoffs to classify the
network output one way ot the other.

```
$ go test -v ./neural -run TestMLPMultiLayerBool
=== RUN   TestMLPMultiLayerBool
=== RUN   TestMLPMultiLayerBool/must
    mlp_test.go:114: input: [0 0], prediction: [0.12680678], label: [0]
    mlp_test.go:114: input: [0 1], prediction: [0.10898689], label: [0]
    mlp_test.go:114: input: [1 0], prediction: [0.8846526], label: [1]
    mlp_test.go:114: input: [1 1], prediction: [0.8737482], label: [1]
=== RUN   TestMLPMultiLayerBool/and
    mlp_test.go:114: input: [0 0], prediction: [0.03306453], label: [0]
    mlp_test.go:114: input: [0 1], prediction: [0.09745012], label: [0]
    mlp_test.go:114: input: [1 0], prediction: [0.1063798], label: [0]
    mlp_test.go:114: input: [1 1], prediction: [0.8444925], label: [1]
=== RUN   TestMLPMultiLayerBool/or
    mlp_test.go:114: input: [0 0], prediction: [0.08692269], label: [0]
    mlp_test.go:114: input: [0 1], prediction: [0.95728356], label: [1]
    mlp_test.go:114: input: [1 0], prediction: [0.9525525], label: [1]
    mlp_test.go:114: input: [1 1], prediction: [0.97686994], label: [1]
=== RUN   TestMLPMultiLayerBool/xor
    mlp_test.go:114: input: [0 0], prediction: [0.028652104], label: [0]
    mlp_test.go:114: input: [0 1], prediction: [0.9467217], label: [1]
    mlp_test.go:114: input: [1 0], prediction: [0.04812079], label: [0]
    mlp_test.go:114: input: [1 1], prediction: [0.9651075], label: [1]
--- PASS: TestMLPMultiLayerBool (0.00s)
    --- PASS: TestMLPMultiLayerBool/must (0.00s)
    --- PASS: TestMLPMultiLayerBool/and (0.00s)
    --- PASS: TestMLPMultiLayerBool/or (0.00s)
    --- PASS: TestMLPMultiLayerBool/xor (0.00s)
PASS
ok  	github.com/kujenga/goml/neural	0.243s
```

## Validating on MNIST

Now that we have established that our network can learn boolean functions, let's
crank things up a few notches and take on the MNIST dataset.

{{< img "MnistExamples.png" "MNIST Examples" >}}

> Josef Steppan, CC BY-SA 4.0 <https://creativecommons.org/licenses/by-sa/4.0>, via Wikimedia Commons

### Parsing MNIST

Before we can start working with the MNIST dataset directly, we need to parse it
into a usable form. The dataset is stored in a rather unique binary format,
which we handle as two separate parsing steps.

First, we create a parser for the binary [idx][gopkgIDX] dataset format, which
returns the following parsed data structure from the binary files read out from
disk.

{{< emgithub "https://github.com/kujenga/goml/blob/fc6bc437686cf50dc0ba9f3bb7f7e7ee23bc611d/idx/idx.go#L16-L24" >}}

Secong, we create an [mnist][gopkgMNIST] package which builds on IDX parser to
read in the specific MNIST dataset using the capabilities of the IDX reader, and
returns the following data structure for use in tests.

{{< emgithub "https://github.com/kujenga/goml/blob/fc6bc437686cf50dc0ba9f3bb7f7e7ee23bc611d/mnist/mnist.go#L14-L26" >}}

This parsing code is based directly on the MNIST spec and is all specified in
the files linked to from the snippets just above, with corresponding test cases
in those packages as well.

### One-hot encoding

Neural Networks are generally weaker when you are trying to predict a range of
outputs from a single neuron. As an example of why this is the case, let's look
at the numbers `7` and `8`. Numerically, they are right next to each other, but
when visually represented, there is nothing about those two numbers which makes
them closer together than any other pair of numbers in the range 0-9. Because
our network is a mathematical combination of predictions, it would be difficult
to have a network that could output a single numeric value quantized 0-9 to
represent these digits.

One-hot encoding solves this problem. It uses a vector of binary values to make
all the possible categorical outcomes independent of each other, as shown in
thiws diagram, where "8" is mapped to a single "1" value within a vector.
One-hot encodings are very useful for categorical variables, and that is what we
will use here for representing MNIST.

{{< img "35-mnist-one-hot.png" "MNIST One-hot encoding" >}}

### MNIST Network Architecture

Now that we have our dataset ready, we can start architecting our network. The
following diagram depicts about what our network will look like conceptually,
and is based on the network architectures documented on the MNIST page
[^mnistArchive], one of which is `2-layer NN, 300 hidden units, mean square
error`, which we will replicate here, though modifications of this architecture
with a different number of layers, layer sizes, etc. still do perform well!

{{< img "36-mnist-architecture.png" "MNIST Network Architecture" >}}

### MNIST Test cases

In a similar manner to the boolean test cases above, we lay out our network
architecture for the MNIST network, execute the training process, and then
validate our network performance.

One key difference here is that we are training and validating on separate
datasets, which are given to us separately by the MNIST dataset itself.

> For speed of execution in CI systems, the following test case limits the
> dataset size to 1/6 of what it normally would be, with 60k total examples.
> This is a trick that can be useful generally, to use a subset of your dataset
> that can by more quickly trained on to get things functional, and then pulling
> in the rest of the data later as you fine tune the architecture.

{{< emgithub "https://github.com/kujenga/goml/blob/fc6bc437686cf50dc0ba9f3bb7f7e7ee23bc611d/neural/mlp_test.go#L270-L303" >}}

Validating our network performance is a bit more involved here than it was for
the boolean test cases, as we need to compute an _error rate_ for the network as
a whole, rather than just asserting that it must be correct all the time as we
did with the boolean test cases. Our test can then assert that the error rate is
below a given threshold. The `predictionTestOneHot` function does this for us:

{{< emgithub "https://github.com/kujenga/goml/blob/fc6bc437686cf50dc0ba9f3bb7f7e7ee23bc611d/neural/mlp_test.go#L128-L148" >}}

Running these tests locally, (with a slight modification to the source to remove
the `[:10000]` slicing that just speeds up CI execution) we get the following
output:

```
$ go test -v ./neural -run MNIST
=== RUN   TestMLPMultiLayerMNIST
    mlp_test.go:289: {Epoch:0 Loss:0.010991104}
    mlp_test.go:289: {Epoch:1 Loss:0.0065983073}
    mlp_test.go:289: {Epoch:2 Loss:0.0057215523}
    mlp_test.go:289: {Epoch:3 Loss:0.0051340326}
    mlp_test.go:289: {Epoch:4 Loss:0.004867792}
    mlp_test.go:145: one-hot predictions score: 0.9644
--- PASS: TestMLPMultiLayerMNIST (86.19s)
PASS
ok  	github.com/kujenga/goml/neural	86.409s
```

A score of `0.9644` is equivalent to an error rate of 3.56 percent, which is a
bit better than the equivalent network architecture listed on the MNIST site! I
would call that a success.

## Conclusions and Future work

At this point, we've walked through the full lifecycle of creating a fully
functioning neural network in Go from scratch, using just the tools given to us
in the Go standard library.

Future work may explore extensions of this network to provide additional
functionality, such as batch and mini-batch approaches to the gradient descent
phase.

We could also look at building on top of this network to target better MNIST
performance through architectures like a Convolutional Neural Network which is
particularly well suited for image-related tasks, and try to apply this network
to additional image recognition datasets. Another avenue to explore is extending
and refactoring this network to support Recurrent Neural Networks, which can be
used on streams of data like text.

Another avenue to explore would be comparing the straightforward implementation
we have here with approaches taken by other libraries, including Go-oriented
libraries like [golearn][golearn], or some of the flagship libraries like
[tensorflow][tensorflow] and [pytorch][pytorch] which utilize a unique model to
have the same code be runnable by a variety of execution backends like GPUs.

These may be topics for future posts! If you've made it this far, thanks for
following along and I hope you found this helpful in gaining a deeper
understanding of the basics of neural networks.

## Resources

Source code for this project cam be found here: https://github.com/kujenga/goml

The corresponding documentation is available here: https://pkg.go.dev/github.com/kujenga/goml

References and further learning:
- The [Backpropagation explained][deeplizardBackPropExplained] YouTube series by
  [Deeplizard][deeplizardPage] is a great reference to go into even more detail
  on the concept and math behind the derivation process for backpropagation.
- [Make Your Own Neural Network][myoNNTariqRashid] is a fantastic book/e-book by
  Tariq Rashid that goes into more detail and background on this topic, and
  creates a functional network written in Python, exploring additional
  applications of linear algebra as well.
- [Build an Artificial Neural Network From Scratch: Part 1][annFromScratch] is a helpful blog post from KDNuggets for walking through a simplified example of single layer networks.
- The MNIST dataset, originally from [Yann Lecun][yannLeCunMNIST], and is also
  mirrored at: https://deepai.org/dataset/mnist

> Additionally, this post is based on a talk given for [Boston
> Golang](http://bostongolang.org/) in [Sept.
> 2021](https://www.meetup.com/bostongo/events/280522108/), the slides for which
> can be found here: [Building a Neural Network in Go][slideDeck]

<!-- Footnotes -->
[^mixedPrecision]: https://developer.nvidia.com/blog/mixed-precision-training-deep-neural-networks/
[^goGenerics]: https://go.dev/blog/generics-proposal
[^lossFunctions]: https://www.theaidream.com/post/loss-functions-in-neural-networks
[^gradientDescentTypes]: https://www.analyticsvidhya.com/blog/2021/03/variants-of-gradient-descent-algorithm/
[^mnistArchive]: https://web.archive.org/web/20211125025603/http://yann.lecun.com/exdb/mnist/ (We utilize a link to the archive page here as the original website is observed to sometimes give authorization errors)

<!-- Links -->
[repo]: https://github.com/kujenga/goml
[slideDeck]: https://docs.google.com/presentation/d/1fFeRehIzcdtE_ujWfvYhrytWLYZrXDeQ4AvZnDqCKfc/edit
[perceptronWiki]: https://en.wikipedia.org/wiki/Perceptron
[gradientDescentWiki]: https://en.wikipedia.org/wiki/Gradient_descent
[deeplizardPage]: https://www.youtube.com/deeplizard
[deeplizardBackPropIntuition]: https://www.youtube.com/watch?v=XE3krf3CQls
[deeplizardBackPropGradient]: https://www.youtube.com/watch?v=Zr5viAZGndE
[deeplizardBackPropExplained]: https://www.youtube.com/playlist?list=PLZbbT5o_s2xq7LwI2y8_QtvuXZedL6tQU
[powerRule]: https://en.wikipedia.org/wiki/Power_rule
[gopkgIDX]: https://pkg.go.dev/github.com/kujenga/goml@v0.0.0-20210928201159-b73f61220256/idx
[gopkgMNIST]: https://pkg.go.dev/github.com/kujenga/goml@v0.0.0-20210928201159-b73f61220256/mnist
[myoNNTariqRashid]: https://smile.amazon.com/Make-Your-Own-Neural-Network/dp/1530826608/
[annFromScratch]: https://www.kdnuggets.com/2019/11/build-artificial-neural-network-scratch-part-1.html
[yannLeCunMNIST]: https://yann.lecun.com/exdb/mnist/
[tensorflow]: https://www.tensorflow.org/learn
[pytorch]: https://pytorch.org/docs/stable/index.html

<!-- Attribution -->
