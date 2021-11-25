+++
date = "2021-11-22T07:32:55-05:00"
title = "Building a Neural Network in Go"
description = """
Creating a basic neural network from scratch, with just the Go standard library.
"""
categories = []
tags = []
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


## Backpropagation: Training the network


## Boolean test cases


## Validating on MNIST


## Performance


## Future work


## Resources


> Additionally, this post is based on a talk given for [Boston
> Golang](http://bostongolang.org/) in [Sept.
> 2021](https://www.meetup.com/bostongo/events/280522108/), the slides for which
> can be found here: [Building a Neural Network in Go][slideDeck]

<!-- Footnotes -->
[^mixedPrecision]: https://developer.nvidia.com/blog/mixed-precision-training-deep-neural-networks/

<!-- Links -->
[repo]: https://github.com/kujenga/goml
[slideDeck]: https://docs.google.com/presentation/d/1fFeRehIzcdtE_ujWfvYhrytWLYZrXDeQ4AvZnDqCKfc/edit
[perceptronWiki]: https://en.wikipedia.org/wiki/Perceptron
[goGenerics]: https://go.dev/blog/generics-proposal

<!-- Attribution -->
