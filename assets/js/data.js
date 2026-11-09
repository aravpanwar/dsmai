/*
  The map's content. Each concept lists what it `needs`: the concepts it is
  built on. Needs must come from the same layer or an earlier one, so every
  dependency on the map flows left to right. Run `node scripts/check.js`
  after editing.

  Fields: id, label, text, needs, aka (extra search terms), year, ref (a link
  to the paper or project).

  This data is licensed under Creative Commons Attribution 4.0 (CC BY 4.0):
  https://creativecommons.org/licenses/by/4.0/
  Reuse it freely, with credit to Arav Panwar and a link to
  https://dsmai.aravpanwar.com/. The code around it is MIT licensed.
*/
(function () {
  const layers = [
    { id: "math", name: "Mathematics", note: "The language everything to the right is written in." },
    { id: "compute", name: "Computing", note: "Hardware and numerics that turn the maths into arithmetic at scale." },
    { id: "methods", name: "Methods", note: "How machines learn from data, before and beneath deep learning." },
    { id: "software", name: "Software", note: "Libraries and frameworks that make the methods usable." },
    { id: "arch", name: "Architectures", note: "Neural network building blocks and model families." },
    { id: "models", name: "Models", note: "Landmark models and the techniques that made them work." },
    { id: "fields", name: "Fields", note: "The disciplines people mean when they say AI." },
    { id: "apps", name: "Applications", note: "What gets built and shipped on top of it all." },
  ];

  const nodes = [];
  function add(layer, group, list) {
    for (const n of list) nodes.push({ layer, group, needs: [], ...n });
  }
  const arxiv = (id) => "https://arxiv.org/abs/" + id;

  /* ---------------- mathematics ---------------- */

  add("math", "Linear algebra", [
    { id: "vectors", label: "Vectors",
      text: "Lists of numbers you can add and scale. Every input a model sees (a pixel patch, a word, a user) ends up as a vector, and so does every hidden state." },
    { id: "dot", label: "Dot products and norms", needs: ["vectors"], aka: "inner product length distance",
      text: "The dot product measures how much two vectors point the same way; a norm measures length. Neurons, attention scores and distance-based methods are all dot products underneath." },
    { id: "cosine", label: "Cosine similarity", needs: ["dot"],
      text: "A dot product divided by both lengths, so only direction counts. The default way to ask whether two embeddings mean similar things." },
    { id: "matrices", label: "Matrices and linear maps", needs: ["vectors"],
      text: "A matrix is a function that maps vectors to vectors by rotating, stretching and projecting them. A neural network layer is a matrix followed by a nonlinearity." },
    { id: "matmul", label: "Matrix multiplication", needs: ["matrices", "dot"], aka: "matmul gemm",
      text: "Composing linear maps, computed as many dot products at once. It is most of the arithmetic in deep learning, which is why chips are judged by how fast they multiply matrices." },
    { id: "projections", label: "Projections", needs: ["dot", "matrices"],
      text: "Splitting a vector into the part inside a subspace and the part outside it. Least squares, PCA and Gram-Schmidt are all projection problems." },
    { id: "eigen", label: "Eigenvectors", needs: ["matrices"],
      text: "Directions a matrix only stretches and never turns. They describe a system's stable modes: PageRank, covariance structure, and whether repeated multiplication explodes or vanishes." },
    { id: "svd", label: "Singular values (SVD)", needs: ["eigen", "projections"], aka: "svd low rank",
      text: "Any matrix factors into rotate, scale, rotate. Keeping only the largest singular values gives the best low-rank approximation, the idea behind PCA, matrix factorisation for recommendations, and LoRA." },
    { id: "tensors", label: "Tensors", needs: ["matrices"], aka: "ndarray",
      text: "Arrays with any number of axes. A batch of colour images is a 4-axis tensor (batch, channel, height, width). Deep learning frameworks are, at heart, libraries of fast tensor operations." },
  ]);

  add("math", "Calculus", [
    { id: "derivatives", label: "Derivatives",
      text: "How fast a function's output changes as its input changes. Training asks the same question over and over: which way should each weight move to make the loss smaller?" },
    { id: "gradients", label: "Gradients", needs: ["derivatives", "vectors"],
      text: "With millions of inputs, the gradient collects every partial derivative into one vector that points uphill. Step the other way and the loss goes down." },
    { id: "chainrule", label: "The chain rule", needs: ["derivatives"],
      text: "The derivative of a composition is the product of the derivatives along the way. Backpropagation is the chain rule applied carefully to a very deep composition." },
    { id: "jacobian", label: "Jacobians and Hessians", needs: ["gradients", "matrices"],
      text: "Matrices of first and second derivatives. Jacobians carry gradients between layers; Hessians describe curvature, which is why some loss surfaces are easy to descend and others are not." },
    { id: "integrals", label: "Integration", needs: ["derivatives"],
      text: "Summing infinitely many small pieces. Continuous probabilities, expectations and the volume rendering in NeRF are all integrals, usually approximated by sampling." },
    { id: "odes", label: "Differential equations", needs: ["gradients", "integrals"], aka: "ode sde dynamics",
      text: "Equations for how a system changes over time. Diffusion models run a stochastic differential equation backwards, and state space models discretise continuous dynamics." },
  ]);

  add("math", "Probability", [
    { id: "probability", label: "Probability theory",
      text: "The mathematics of uncertainty. Modern models output distributions rather than answers: a language model is a probability distribution over the next token." },
    { id: "randvar", label: "Probability distributions", needs: ["probability", "integrals"],
      text: "Quantities whose values are uncertain, described by a distribution. Training data is treated as samples from an unknown distribution that the model tries to approximate." },
    { id: "conditional", label: "Conditional probability", needs: ["probability"], aka: "bayes theorem",
      text: "How beliefs should change given evidence. Classification estimates p(label | input); generation samples from p(next | previous)." },
    { id: "expectation", label: "Expectation and variance", needs: ["randvar"],
      text: "The average outcome and its spread. A loss is an expectation over the data, and keeping variance under control is the reason for careful initialisation and normalisation layers." },
    { id: "gaussian", label: "Gaussian distribution", needs: ["randvar"], aka: "normal distribution bell curve",
      text: "The bell curve, which appears whenever many small effects add up. Diffusion models add Gaussian noise step by step and learn to take it away." },
    { id: "markov", label: "Markov chains", needs: ["conditional"],
      text: "Processes where the next state depends only on the current one. They underpin decision processes in reinforcement learning, hidden Markov models, and the noising process in diffusion." },
    { id: "montecarlo", label: "Monte Carlo sampling", year: 1949, needs: ["expectation"], aka: "sampling",
      text: "Estimate an average by drawing random samples instead of solving it exactly. Minibatch gradients, dropout, tree search and text sampling are all Monte Carlo estimates." },
    { id: "graphical", label: "Graphical models", year: 1985, needs: ["conditional", "graphs"], aka: "bayesian networks markov random fields probabilistic",
      text: "Joint distributions drawn as graphs, where each edge is a direct dependency. Bayesian networks and Markov random fields made reasoning under uncertainty tractable; HMMs and naive Bayes are small special cases." },
    { id: "mcmc", label: "Markov chain Monte Carlo", year: 1953, needs: ["markov", "montecarlo"], aka: "mcmc metropolis gibbs langevin",
      text: "Sample from a distribution you can only evaluate up to a constant, by running a Markov chain that settles into it. Bayesian statistics runs on it, and Langevin sampling is a close relative of how diffusion models generate." },
  ]);

  add("math", "Statistics", [
    { id: "mle", label: "Maximum likelihood", needs: ["conditional", "randvar"], aka: "mle estimation",
      text: "Choose the parameters that make the observed data most probable. Minimising cross-entropy loss is maximum likelihood in disguise, which is how almost every model is trained." },
    { id: "bayesian", label: "Bayesian inference", needs: ["conditional"], aka: "prior posterior",
      text: "Treat parameters as uncertain and update a prior into a posterior as data arrives. L2 regularisation is a Gaussian prior in disguise, and Bayesian ideas are behind most uncertainty estimates." },
    { id: "leastsq", label: "Least squares", needs: ["projections", "mle"],
      text: "Fit a line or hyperplane by minimising squared errors, which is a projection onto the column space. It is also maximum likelihood when the noise is Gaussian." },
    { id: "biasvar", label: "Bias-variance tradeoff", needs: ["expectation"], aka: "overfitting underfitting",
      text: "Simple models miss patterns; flexible ones memorise noise. Overfitting, regularisation and validation sets all exist to manage this tension." },
    { id: "hypothesis", label: "Hypothesis testing", needs: ["expectation", "randvar"], aka: "confidence interval significance",
      text: "Deciding whether a difference is real or noise. A model that beats another by two points on a 500-question benchmark may not be better at all." },
  ]);

  add("math", "Optimisation", [
    { id: "graddescent", label: "Gradient descent", needs: ["gradients"], aka: "optimization",
      text: "Repeatedly take a small step against the gradient. Simple, and with enough refinements it trains networks with trillions of parameters." },
    { id: "convex", label: "Convex optimisation", needs: ["gradients", "jacobian"], aka: "convexity",
      text: "When the loss surface is a single bowl, any downhill path reaches the global minimum. Classical ML lives here; deep learning gave up the guarantee and found it mostly did not matter." },
    { id: "lagrange", label: "Lagrange multipliers", needs: ["gradients"], aka: "constrained optimization",
      text: "Optimise under constraints by folding them into the objective. The dual form of the support vector machine, which makes the kernel trick possible, comes from here." },
    { id: "minimax", label: "Minimax and game theory", needs: ["probability"], aka: "nash equilibrium zero sum",
      text: "Choosing the best move assuming an opponent does the same. Chess engines search a minimax tree, and a GAN is a two-player minimax game." },
  ]);

  add("math", "Information theory", [
    { id: "entropy", label: "Entropy", year: 1948, needs: ["expectation"], aka: "information bits shannon",
      text: "The average surprise of a distribution, measured in bits. It sets the limit of lossless compression, and a language model's loss is literally how many bits it needs per token." },
    { id: "crossent", label: "Cross-entropy", year: 1948, needs: ["entropy"],
      text: "The cost of encoding data from one distribution with a code built for another. The standard loss for classification and language modelling." },
    { id: "kl", label: "KL divergence", year: 1951, needs: ["crossent"], aka: "kullback leibler relative entropy",
      text: "How far one distribution is from another, as extra bits. It keeps a VAE's codes close to a prior, and keeps an RLHF-tuned model close to where it started." },
    { id: "mutualinfo", label: "Mutual information", year: 1948, needs: ["kl"], aka: "infonce",
      text: "How much knowing one variable tells you about another. Contrastive objectives such as InfoNCE maximise a lower bound on it." },
  ]);

  add("math", "Signals", [
    { id: "convolution", label: "Convolution", needs: ["integrals"], aka: "filter kernel",
      text: "Slide one function over another and sum the products. Apply small learned kernels this way to an image and you have a convolutional network." },
    { id: "fourier", label: "Fourier analysis", needs: ["integrals"], aka: "fft spectrogram frequency",
      text: "Any signal is a sum of sine waves. Spectrograms that feed speech models come from it, and so do the sinusoidal and rotary position encodings in transformers." },
  ]);

  add("math", "Discrete maths", [
    { id: "graphs", label: "Graph theory", aka: "nodes edges network",
      text: "Nodes and edges. A neural network is a computation graph, a knowledge base is a graph of facts, and molecules and social networks are graphs to learn on." },
    { id: "logic", label: "Logic", aka: "boolean propositional first order",
      text: "Formal rules for valid inference. The first wave of AI, theorem provers and expert systems, was built on it." },
  ]);

  /* ---------------- computing ---------------- */

  add("compute", "Hardware", [
    { id: "cpu", label: "CPUs and SIMD", year: 1971, aka: "avx neon vector instructions",
      text: "General-purpose processors with vector instructions that apply one operation to many numbers at once. Still where most classical ML and a lot of local inference runs." },
    { id: "gpu", label: "GPUs", year: 1999, needs: ["matrices"], aka: "graphics card nvidia",
      text: "Thousands of simple cores, built to transform triangles for games, turned out to be ideal for matrix maths. Neural networks became practical when they moved onto GPUs." },
    { id: "tpu", label: "TPUs and accelerators", year: 2016, needs: ["matmul"], aka: "asic systolic array npu",
      text: "Chips built around systolic arrays that do little except multiply matrices, trading flexibility for throughput per watt. Google's TPU is the best known." },
    { id: "hbm", label: "Memory bandwidth (HBM)", year: 2013, aka: "memory wall high bandwidth memory",
      text: "How fast data reaches the compute units. When generating text one token at a time, the bottleneck is reading the weights from memory, not the arithmetic." },
    { id: "interconnect", label: "Interconnects", year: 1999, needs: ["gpu"], aka: "nvlink infiniband network",
      text: "NVLink, InfiniBand and other links between accelerators. Training a frontier model on tens of thousands of GPUs is as much a networking problem as a maths one." },
  ]);

  add("compute", "Numerics", [
    { id: "float", label: "Floating-point formats", year: 1985, aka: "fp32 fp16 bf16 fp8 bfloat16 precision",
      text: "How real numbers are stored in 32, 16 or 8 bits. Narrower formats such as bfloat16 and FP8 halve memory and roughly double speed, as long as training stays numerically stable." },
    { id: "rng", label: "Pseudo-random numbers", year: 1946, aka: "rng seed",
      text: "Deterministic sequences that look random. Initialisation, shuffling, dropout and sampling all need them, and fixing the seed makes a run reproducible." },
    { id: "blas", label: "BLAS and LAPACK", year: 1979, needs: ["matmul", "svd", "cpu"], aka: "linear algebra routines",
      text: "Standard interfaces for vector and matrix routines, dating back to Fortran in the 1970s and hand-tuned for each chip. NumPy, SciPy and every framework call into them." },
    { id: "compgraph", label: "Computation graphs", year: 1970, needs: ["graphs"], aka: "dataflow graph",
      text: "A program written as a graph of tensor operations. Once a computation is a graph, it can be differentiated, optimised and split across devices." },
    { id: "autodiff", label: "Automatic differentiation", year: 1970, needs: ["chainrule", "compgraph", "jacobian"], aka: "autograd reverse mode",
      text: "Exact derivatives of any program, by applying the chain rule through each operation. Reverse mode gets the gradient for millions of parameters at roughly the cost of one forward pass." },
  ]);

  add("compute", "Distributed systems", [
    { id: "distributed", label: "Distributed computing", needs: ["interconnect"], aka: "all-reduce cluster",
      text: "Splitting work across many machines and keeping them in sync. Collective operations such as all-reduce let thousands of GPUs average their gradients." },
  ]);

  add("compute", "Data", [
    { id: "webdata", label: "Web-scale text", year: 2008, needs: ["distributed"], ref: "https://commoncrawl.org/", aka: "common crawl corpus pretraining data",
      text: "Common Crawl has published free snapshots of billions of web pages for more than fifteen years. Filtered versions of it make up most of the pretraining text behind large language models." },
    { id: "imagenet", label: "ImageNet", year: 2009, ref: "https://www.image-net.org/", aka: "dataset ilsvrc",
      text: "About 14 million images labelled by crowd workers into more than 20,000 categories. Its annual challenge is where deep learning first won decisively, in 2012." },
    { id: "labelling", label: "Human labelling", aka: "annotation crowdsourcing preference data mechanical turk",
      text: "People drawing boxes, transcribing audio, writing example answers and ranking pairs of model outputs. Every supervised model and every RLHF run rests on this work, much of it outsourced." },
  ]);

  /* ---------------- methods ---------------- */

  add("methods", "Paradigms", [
    { id: "supervised", label: "Supervised learning", year: 1959, needs: ["mle", "biasvar", "labelling"], aka: "classification regression labels",
      text: "Learn a mapping from inputs to labelled outputs. Most practical ML is still this: spam or not, price, diagnosis." },
    { id: "unsupervised", label: "Unsupervised learning", year: 1959, needs: ["randvar"],
      text: "Find structure in unlabelled data: clusters, low-dimensional structure, density." },
    { id: "selfsup", label: "Self-supervised learning", year: 2013, needs: ["supervised", "unsupervised"], aka: "pretraining masked next token",
      text: "Make the labels from the data itself, such as the next word or a hidden image patch. How models learn from the internet without anyone labelling it." },
  ]);

  add("methods", "Classical models", [
    { id: "linreg", label: "Linear regression", needs: ["leastsq"],
      text: "Predict a number as a weighted sum of features. The baseline every other model has to beat." },
    { id: "logreg", label: "Logistic regression", year: 1958, needs: ["mle", "crossent", "convex"], aka: "sigmoid classifier",
      text: "A linear model squashed through a sigmoid to give a probability. One logistic regression is one artificial neuron." },
    { id: "naivebayes", label: "Naive Bayes", year: 1961, needs: ["conditional", "graphical"],
      text: "Classify with Bayes' rule while assuming every feature is independent. The assumption is wrong, and it still makes a good spam filter." },
    { id: "knn", label: "k-nearest neighbours", year: 1951, needs: ["dot"], aka: "knn",
      text: "Predict from the most similar stored examples. No training at all, and the same idea returns as vector search in retrieval systems." },
    { id: "svm", label: "Support vector machines", year: 1992, needs: ["lagrange", "convex", "dot"], aka: "svm kernel trick",
      text: "Find the boundary with the widest margin between classes. The kernel trick lets them learn curved boundaries, and they were the state of the art before deep learning." },
    { id: "trees", label: "Decision trees", year: 1984, needs: ["entropy"], aka: "cart gini",
      text: "A flowchart of if-then splits, each chosen to make the groups purer. Easy to read, and the building block of the strongest methods for tabular data." },
    { id: "forest", label: "Random forests", year: 2001, needs: ["trees", "montecarlo"], aka: "bagging bootstrap ensemble",
      text: "Many trees, each trained on a random resample with random features, voting together. Averaging them reduces variance." },
    { id: "boosting", label: "Gradient boosting", year: 1999, needs: ["trees", "graddescent"], aka: "gbdt gbm ensemble",
      text: "Add trees one at a time, each fitting the errors of the ones before. Still the method that wins most tabular-data competitions." },
    { id: "hmm", label: "Hidden Markov models", year: 1966, needs: ["markov", "mle", "graphical"], aka: "hmm viterbi",
      text: "A Markov chain over hidden states that emit observations. Speech recognition ran on HMMs for about 30 years." },
    { id: "arima", label: "Forecasting (ARIMA)", year: 1970, needs: ["leastsq", "expectation"], aka: "time series autoregression exponential smoothing",
      text: "Classical time-series models that predict the next value from past values and past errors. Still strong baselines that deep forecasting models often fail to beat." },
  ]);

  add("methods", "Unsupervised", [
    { id: "kmeans", label: "k-means clustering", year: 1957, needs: ["dot", "expectation"], aka: "clustering",
      text: "Assign every point to the nearest of k centres, move each centre to the middle of its points, repeat." },
    { id: "gmm", label: "Gaussian mixtures and EM", year: 1977, needs: ["gaussian", "mle"], aka: "expectation maximisation",
      text: "Model data as a blend of Gaussians and fit it with expectation-maximisation, alternating between guessing assignments and refitting." },
    { id: "pca", label: "Principal components", year: 1901, needs: ["svd", "expectation"], aka: "pca dimensionality reduction",
      text: "Find the directions of greatest variance and project onto them. The standard way to compress, denoise or visualise high-dimensional data." },
    { id: "tsne", label: "t-SNE and UMAP", year: 2008, needs: ["kl", "graphs"], aka: "visualisation embedding projection",
      text: "Nonlinear maps that flatten high-dimensional data into 2D while keeping neighbours close. Most pictures of embedding spaces are made this way." },
  ]);

  add("methods", "Training", [
    { id: "loss", label: "Loss functions", needs: ["mle", "crossent"], aka: "objective cost mse",
      text: "A single number that scores how wrong the model is. Choosing it decides what the model learns; everything else is machinery for making it smaller." },
    { id: "sgd", label: "Stochastic gradient descent", year: 1951, needs: ["graddescent", "montecarlo"], aka: "sgd minibatch",
      text: "Gradient descent on small random batches instead of the whole dataset. Noisy and cheap, and the noise even seems to help generalisation." },
    { id: "backprop", label: "Backpropagation", needs: ["chainrule", "autodiff", "loss"], year: 1986, aka: "backward pass",
      text: "Run the network forward, then pass error signals backwards layer by layer to get the gradient for every weight. Popularised in 1986 and used to train every neural network since." },
    { id: "adam", label: "Momentum and Adam", needs: ["sgd"], year: 2014, ref: arxiv("1412.6980"), aka: "adamw optimizer",
      text: "Optimisers that smooth gradients over time and scale the step for each parameter separately. AdamW is the default for training transformers." },
    { id: "init", label: "Weight initialisation", year: 2010, needs: ["expectation", "rng"], ref: arxiv("1502.01852"), aka: "xavier he kaiming",
      text: "Start weights at a scale that stops signals shrinking or exploding as they pass through many layers. Xavier and He initialisation made deep networks trainable." },
    { id: "regular", label: "Regularisation", year: 1943, needs: ["biasvar", "bayesian"], aka: "l1 l2 weight decay",
      text: "Penalties that keep a model simple, such as weight decay. They trade a little training accuracy for better behaviour on data the model has not seen." },
    { id: "dropout", label: "Dropout", needs: ["regular", "rng"], year: 2012, ref: arxiv("1207.0580"),
      text: "Randomly switch off units during training so no unit can depend on another being there. Works like training a large ensemble for the price of one network." },
    { id: "validation", label: "Cross-validation", year: 1974, needs: ["biasvar", "hypothesis"], aka: "train test split holdout",
      text: "Hold out data the model never trains on, and measure it there. The only honest estimate of how a model will do in the world." },
    { id: "metrics", label: "Evaluation metrics", needs: ["hypothesis", "conditional"], aka: "accuracy precision recall auc bleu perplexity",
      text: "Accuracy, precision and recall, AUC, BLEU, perplexity. Each measures a different kind of success, and models end up tuned to whichever one gets chosen." },
  ]);

  add("methods", "Representations", [
    { id: "embeddings", label: "Embeddings", year: 2003, needs: ["vectors", "cosine"], aka: "vector representation latent",
      text: "Represent discrete things (words, products, users) as learned vectors, placed so that similar things end up close together. The common currency of almost every modern model." },
    { id: "contrastive", label: "Contrastive learning", needs: ["mutualinfo", "cosine", "selfsup"], year: 2020, ref: arxiv("2002.05709"), aka: "simclr infonce",
      text: "Learn representations by pulling matching pairs together and pushing everything else apart. How CLIP lines up images with their captions." },
    { id: "ann", label: "Nearest-neighbour search", year: 1998, needs: ["knn", "graphs"], ref: arxiv("1603.09320"), aka: "hnsw ann vector search",
      text: "Find similar vectors among billions without comparing against all of them, using graph indexes such as HNSW or quantised clusters. Every vector database is built on it." },
  ]);

  add("methods", "Decision making", [
    { id: "mdp", label: "Markov decision processes", year: 1957, needs: ["markov", "expectation"], aka: "mdp reward state action",
      text: "States, actions, rewards and transitions: the formal setup for an agent making a sequence of decisions." },
    { id: "qlearning", label: "Q-learning", year: 1989, needs: ["mdp"], aka: "bellman equation temporal difference",
      text: "Learn how much future reward each action is worth, using the Bellman equation to improve estimates from other estimates." },
    { id: "policygrad", label: "Policy gradients", year: 1992, needs: ["mdp", "gradients", "montecarlo"], aka: "reinforce actor critic",
      text: "Adjust a policy's parameters directly so that actions which led to reward become more likely. The family PPO and RLHF belong to." },
    { id: "mcts", label: "Monte Carlo tree search", year: 2006, needs: ["minimax", "montecarlo", "graphs"], aka: "mcts",
      text: "Plan by simulating many possible futures and spending more effort on the promising branches. The search half of AlphaGo." },
  ]);

  add("methods", "Symbolic AI", [
    { id: "search", label: "Search and planning", year: 1950, needs: ["graphs", "logic"], aka: "a* minimax constraint satisfaction",
      text: "Find a sequence of steps to a goal by exploring a space of states: A*, minimax, constraint solvers. Classical AI before learning took over, and still inside route planners and game engines." },
    { id: "kr", label: "Knowledge representation", year: 1965, needs: ["logic", "graphs"], aka: "expert systems knowledge graph ontology",
      text: "Write facts and rules down explicitly so a system can reason over them. Expert systems in the 1980s; knowledge graphs today." },
  ]);

  add("methods", "Training at scale", [
    { id: "dataparallel", label: "Data parallelism", year: 2012, needs: ["distributed", "sgd"], aka: "ddp fsdp",
      text: "Put a copy of the model on every GPU, give each a different slice of the batch, and average the gradients." },
    { id: "modelparallel", label: "Model parallelism", year: 2012, needs: ["distributed", "matmul"], ref: arxiv("1909.08053"), aka: "model parallelism sharding",
      text: "Split one model across devices, by slicing its matrices or by placing layers on different GPUs, once it no longer fits on one." },
    { id: "mixedprec", label: "Mixed-precision training", year: 2017, needs: ["float", "sgd"], ref: arxiv("1710.03740"), aka: "fp16 bf16 amp",
      text: "Do most of the arithmetic in 16 bits while keeping a 32-bit master copy of the weights. Roughly twice the speed for the same accuracy." },
  ]);

  add("methods", "Data work", [
    { id: "curation", label: "Data curation", needs: ["webdata", "logreg", "probability"], aka: "deduplication dedup minhash filtering quality",
      text: "Strip spam, boilerplate, duplicates and junk from raw data, using heuristics, small classifiers and MinHash to catch near-duplicates. Better data often beats a bigger model." },
  ]);

  /* ---------------- software ---------------- */

  add("software", "Scientific Python", [
    { id: "python", label: "Python", year: 1991, ref: "https://www.python.org/",
      text: "Slow as a language, but a pleasant way to glue together fast C, C++ and CUDA code. That trade made it the language of machine learning." },
    { id: "numpy", label: "NumPy", year: 2006, needs: ["python", "blas", "tensors"], ref: "https://numpy.org/",
      text: "N-dimensional arrays with fast vectorised operations. Its API is the template that PyTorch, JAX and others copied." },
    { id: "scipy", label: "SciPy", needs: ["numpy", "convex"], ref: "https://scipy.org/",
      text: "Optimisation, sparse matrices, statistics and signal processing on top of NumPy." },
    { id: "pandas", label: "pandas", year: 2008, needs: ["numpy"], ref: "https://pandas.pydata.org/", aka: "dataframe",
      text: "Tables with labelled columns, for loading, cleaning and joining data. Much of data science happens here before a model is ever trained." },
    { id: "jupyter", label: "Jupyter", year: 2014, needs: ["python"], ref: "https://jupyter.org/", aka: "notebook",
      text: "Notebooks that mix code, output and notes. Where most models are first prototyped." },
  ]);

  add("software", "GPU stack", [
    { id: "cuda", label: "CUDA", needs: ["gpu"], year: 2007, ref: "https://developer.nvidia.com/cuda-toolkit",
      text: "NVIDIA's platform for programming GPUs. The libraries built on it over two decades are a large part of why NVIDIA dominates AI hardware." },
    { id: "cublas", label: "cuBLAS", year: 2007, needs: ["cuda", "blas"], ref: "https://docs.nvidia.com/cuda/cublas/",
      text: "BLAS for NVIDIA GPUs. When a framework multiplies two large matrices, this (or its cousin CUTLASS) usually does the work." },
    { id: "cudnn", label: "cuDNN", year: 2014, needs: ["cuda", "convolution"], ref: "https://developer.nvidia.com/cudnn",
      text: "NVIDIA's tuned kernels for convolutions, normalisation and attention." },
    { id: "nccl", label: "NCCL", year: 2016, needs: ["cuda", "distributed"], ref: "https://developer.nvidia.com/nccl",
      text: "NVIDIA's library for all-reduce and other collective operations across GPUs and machines." },
    { id: "triton", label: "Triton", year: 2019, needs: ["gpu", "compgraph"], ref: "https://triton-lang.org/", aka: "kernels",
      text: "A Python-like language for writing fast GPU kernels without hand-written CUDA. PyTorch's compiler generates Triton code." },
  ]);

  add("software", "Frameworks", [
    { id: "pytorch", label: "PyTorch", needs: ["python", "numpy", "autodiff", "cublas", "cudnn"], year: 2016, ref: arxiv("1912.01703"), aka: "torch",
      text: "Tensors plus automatic differentiation, in eager and debuggable Python. The default framework for research and for most production training." },
    { id: "tensorflow", label: "TensorFlow and Keras", needs: ["python", "autodiff", "compgraph", "cudnn"], year: 2015, ref: arxiv("1603.04467"),
      text: "Google's framework, designed around static graphs before eager execution won. Keras is its high-level API." },
    { id: "jax", label: "JAX", needs: ["numpy", "autodiff", "xla"], year: 2018, ref: "https://github.com/jax-ml/jax",
      text: "NumPy with composable transformations: grad, jit, vmap. Popular for large-scale research, especially on TPUs." },
  ]);

  add("software", "Compilers and formats", [
    { id: "xla", label: "XLA", year: 2017, needs: ["compgraph", "tpu", "gpu"], ref: "https://openxla.org/", aka: "compiler",
      text: "A compiler that fuses whole tensor programs into efficient kernels for TPUs and GPUs. JAX and TensorFlow compile through it." },
    { id: "onnx", label: "ONNX", year: 2017, needs: ["compgraph"], ref: "https://onnx.ai/", aka: "model format runtime",
      text: "A shared file format for trained models, so they can move between frameworks and run on many runtimes." },
  ]);

  add("software", "Classical ML", [
    { id: "sklearn", label: "scikit-learn", year: 2007, needs: ["numpy", "scipy", "linreg", "logreg", "svm", "forest", "kmeans", "pca", "validation"], ref: "https://scikit-learn.org/", aka: "sklearn",
      text: "One consistent fit and predict interface over nearly every classical algorithm, plus the tools to validate them." },
    { id: "xgboost", label: "XGBoost and LightGBM", year: 2014, needs: ["boosting", "cpu"], ref: "https://xgboost.readthedocs.io/",
      text: "Heavily optimised gradient boosting libraries. On tabular data they remain hard to beat." },
  ]);

  add("software", "Domain libraries", [
    { id: "opencv", label: "OpenCV", needs: ["convolution", "fourier", "cpu"], year: 2000, ref: "https://opencv.org/",
      text: "The classic computer vision toolkit: filters, feature detectors, camera calibration, video input and output. Older than deep learning and still everywhere." },
    { id: "hf", label: "Hugging Face Transformers", year: 2018, needs: ["pytorch"], ref: "https://huggingface.co/docs/transformers", aka: "huggingface hub",
      text: "Pretrained models behind one common interface for downloading, running and fine-tuning them. Turned published checkpoints into one-line imports." },
    { id: "diffusers", label: "Diffusers", year: 2022, needs: ["pytorch"], ref: "https://huggingface.co/docs/diffusers",
      text: "Hugging Face's library of diffusion pipelines, noise schedulers and pretrained image models." },
    { id: "gym", label: "Gymnasium", year: 2016, needs: ["python", "mdp"], ref: "https://gymnasium.farama.org/", aka: "openai gym environments",
      text: "A standard interface to reinforcement learning environments, from CartPole to Atari. The successor to OpenAI Gym." },
    { id: "faiss", label: "FAISS", needs: ["ann", "blas", "gpu"], year: 2017, ref: "https://github.com/facebookresearch/faiss", aka: "similarity search",
      text: "Meta's library for similarity search over billions of vectors, on CPU or GPU." },
  ]);

  add("software", "Scale and data", [
    { id: "deepspeed", label: "DeepSpeed and Megatron-LM", year: 2019, needs: ["pytorch", "nccl", "dataparallel", "modelparallel", "mixedprec"], ref: arxiv("1910.02054"), aka: "zero sharding",
      text: "Libraries for training models too large for any one GPU, by sharding optimiser state across devices (ZeRO) and splitting the layers themselves." },
    { id: "spark", label: "Apache Spark", year: 2010, needs: ["distributed"], ref: "https://spark.apache.org/", aka: "data pipeline",
      text: "Distributed processing for datasets that do not fit on one machine. Training corpora are filtered and deduplicated at this scale." },
  ]);

  /* ---------------- architectures ---------------- */

  add("arch", "Neural basics", [
    { id: "perceptron", label: "Perceptron", needs: ["dot"], year: 1958, aka: "neuron rosenblatt",
      text: "Rosenblatt's learning machine: a weighted sum and a threshold. It can only draw straight boundaries, and the proof of that stalled the field for over a decade." },
    { id: "activations", label: "Activation functions", year: 1943, needs: ["derivatives"], aka: "relu gelu sigmoid tanh swiglu nonlinearity",
      text: "The nonlinearity after each layer. Without one, any stack of layers collapses into a single matrix. ReLU made deep nets trainable; GELU and SwiGLU are used in transformers." },
    { id: "mlp", label: "Multilayer perceptron", needs: ["perceptron", "activations", "backprop", "matmul"], aka: "mlp feedforward dense fully connected",
      text: "Layers of neurons with nonlinearities between them. With enough units it can approximate any function, and it is the feed-forward block inside every transformer." },
    { id: "softmax", label: "Softmax", year: 1989, needs: ["probability", "derivatives"],
      text: "Turns a vector of scores into probabilities that sum to one. Used on classifier outputs and to weight attention." },
    { id: "norm", label: "Normalisation layers", needs: ["expectation"], year: 2015, ref: arxiv("1502.03167"), aka: "batchnorm layernorm rmsnorm",
      text: "Rescale activations to zero mean and unit variance inside the network. BatchNorm made very deep CNNs train; LayerNorm and RMSNorm do the same job in transformers." },
    { id: "residual", label: "Residual connections", needs: ["backprop"], year: 2015, aka: "skip connection",
      text: "Add each block's input to its output, so gradients have a direct path back to early layers. Without them, networks much deeper than 20 layers barely train." },
  ]);

  add("arch", "Convolutional", [
    { id: "cnn", label: "Convolutional networks", needs: ["convolution", "mlp"], year: 1989, aka: "cnn convnet lenet",
      text: "Small learned filters slid across an image, with the same weights reused everywhere. That built-in assumption made them the workhorse of vision from LeNet onwards." },
    { id: "unet", label: "U-Net", needs: ["cnn", "residual"], year: 2015, ref: arxiv("1505.04597"),
      text: "An encoder-decoder CNN with skip connections between matching resolutions. Designed for medical image segmentation, later the denoiser inside diffusion models." },
  ]);

  add("arch", "Sequence models", [
    { id: "rnn", label: "Recurrent networks", year: 1986, needs: ["mlp", "backprop"], aka: "rnn bptt",
      text: "Process a sequence one step at a time, carrying a hidden state forward. Gradients through many steps tend to vanish or explode." },
    { id: "lstm", label: "LSTM and GRU", needs: ["rnn"], year: 1997, aka: "gated recurrent",
      text: "Recurrent units with gates that decide what to keep, forget and output, so information survives long sequences. LSTMs dominated speech and translation in the 2010s." },
    { id: "seq2seq", label: "Encoder-decoder", needs: ["lstm"], year: 2014, ref: arxiv("1409.3215"), aka: "seq2seq sequence to sequence",
      text: "One network reads the input into a representation, another writes the output from it. The template for translation, summarisation and speech recognition." },
    { id: "attention", label: "Attention", needs: ["softmax", "dot", "seq2seq"], year: 2014, ref: arxiv("1409.0473"), aka: "bahdanau cross-attention",
      text: "Let the decoder look back at every input position and weight the relevant ones, instead of squeezing the whole input into one vector. Introduced for translation." },
    { id: "selfattn", label: "Self-attention", year: 2017, needs: ["attention", "matmul"], aka: "query key value qkv multi-head",
      text: "Every position attends to every other position in the same sequence, through query, key and value projections. The cost grows with the square of the sequence length." },
    { id: "posenc", label: "Positional encodings", year: 2017, needs: ["fourier"], ref: arxiv("2104.09864"), aka: "rope rotary alibi",
      text: "Attention ignores order, so position has to be added in. Sinusoids in the original transformer; rotary embeddings (RoPE) in most current LLMs." },
    { id: "transformer", label: "Transformer", needs: ["selfattn", "mlp", "residual", "norm", "posenc"], year: 2017, ref: arxiv("1706.03762"), aka: "attention is all you need",
      text: "Stacked self-attention and feed-forward blocks with residuals and normalisation. No recurrence, so a whole sequence trains in parallel on GPUs. The architecture behind nearly every frontier model." },
    { id: "moe", label: "Mixture of experts", needs: ["mlp", "softmax"], year: 2017, ref: arxiv("1701.06538"), aka: "moe sparse router",
      text: "Many feed-forward experts and a router that sends each token to only a few of them. Total parameters grow while the compute per token stays the same." },
    { id: "ssm", label: "State space models", needs: ["rnn", "odes", "convolution"], year: 2023, ref: arxiv("2312.00752"), aka: "mamba s4 linear recurrence",
      text: "Linear recurrences derived from continuous dynamics, computable as a convolution or a parallel scan. Mamba made them competitive with transformers on long sequences, at linear cost." },
  ]);

  add("arch", "Generative models", [
    { id: "autoregressive", label: "Autoregressive models", needs: ["conditional", "softmax"], aka: "next token prediction",
      text: "Generate one piece at a time, each conditioned on everything before it, by factoring p(x) with the chain rule of probability. GPT and WaveNet both work this way." },
    { id: "autoencoder", label: "Autoencoders", year: 1986, needs: ["mlp", "unsupervised"],
      text: "Squeeze the input through a small code and reconstruct it. The code becomes a learned, compressed representation." },
    { id: "vae", label: "Variational autoencoders", needs: ["autoencoder", "kl", "gaussian"], year: 2013, ref: arxiv("1312.6114"), aka: "vae latent",
      text: "Autoencoders whose codes are distributions, trained with a KL term so that new data can be sampled. Stable Diffusion works inside a VAE's latent space." },
    { id: "gan", label: "Generative adversarial nets", needs: ["mlp", "minimax", "crossent"], year: 2014, ref: arxiv("1406.2661"), aka: "gan generator discriminator",
      text: "A generator and a discriminator trained against each other. Sharp images, unstable training, and the best image generators until diffusion overtook them." },
    { id: "diffusion", label: "Diffusion models", needs: ["gaussian", "markov", "odes", "mcmc"], year: 2015, ref: arxiv("1503.03585"), aka: "denoising score",
      text: "Gradually add noise to data, then train a network to undo each step. Sampling starts from pure noise and denoises it into an image, a sound or a video." },
    { id: "flows", label: "Flow matching", year: 2022, needs: ["jacobian", "odes"], ref: arxiv("2210.02747"), aka: "rectified flow",
      text: "Learn a smooth, invertible path from simple noise to data. Flow matching, a close cousin of diffusion, trains many current image and video models." },
  ]);

  add("arch", "Graph models", [
    { id: "gnn", label: "Graph neural networks", year: 2009, needs: ["graphs", "mlp", "matrices"], ref: arxiv("1609.02907"), aka: "gcn gat message passing",
      text: "Each node updates its vector from its neighbours' vectors, layer by layer. Used for molecules, traffic, fraud and physics simulation." },
  ]);

  /* ---------------- models and techniques ---------------- */

  add("models", "Language", [
    { id: "word2vec", label: "word2vec and GloVe", needs: ["embeddings", "softmax"], year: 2013, ref: arxiv("1301.3781"), aka: "word vectors",
      text: "Word vectors learned from which words appear together, where king minus man plus woman lands near queen. Showed that meaning could live in geometry." },
    { id: "tokenization", label: "Tokenisation (BPE)", year: 2015, needs: ["entropy"], ref: arxiv("1508.07909"), aka: "tokenizer byte pair encoding sentencepiece",
      text: "Split text into subword pieces with byte-pair encoding, a compression algorithm. Models see tokens rather than letters, which is why they struggle to count the r's in strawberry." },
    { id: "bert", label: "BERT", needs: ["transformer", "selfsup", "tokenization"], year: 2018, ref: arxiv("1810.04805"), aka: "encoder masked language model",
      text: "A transformer encoder trained to fill in hidden words using context from both sides. Reset most of NLP within a year and still runs inside a great deal of search and classification." },
    { id: "gpt", label: "GPT and decoder-only LMs", needs: ["transformer", "autoregressive", "selfsup", "tokenization", "webdata", "curation"], year: 2018, ref: arxiv("2005.14165"), aka: "generative pretrained transformer",
      text: "A transformer trained only to predict the next token. With enough data and parameters, that one objective produces translation, coding and reasoning." },
    { id: "scaling", label: "Scaling laws", needs: ["gpt", "leastsq", "curation"], year: 2020, ref: arxiv("2001.08361"), aka: "chinchilla compute optimal",
      text: "Loss falls as a smooth power law in parameters, data and compute. That predictability is what justified spending hundreds of millions on a single training run." },
    { id: "incontext", label: "In-context learning", needs: ["gpt", "scaling"], year: 2020, aka: "few-shot prompt",
      text: "Large models pick up a task from examples in the prompt, with no weight updates. It made the prompt itself a programming interface." },
    { id: "instruct", label: "Instruction tuning", year: 2021, needs: ["gpt", "supervised", "labelling"], aka: "sft supervised fine-tuning",
      text: "Fine-tune a pretrained model on instruction and response pairs, so it follows requests instead of just continuing the text." },
    { id: "rlhf", label: "RLHF", needs: ["instruct", "ppo", "kl", "labelling"], year: 2022, ref: arxiv("2203.02155"), aka: "reinforcement learning from human feedback reward model",
      text: "Train a reward model on human preferences, then optimise the language model against it, with a KL penalty that keeps it near the original. The step that turned GPT-3 into ChatGPT." },
    { id: "dpo", label: "Preference optimisation", needs: ["rlhf", "crossent"], year: 2023, ref: arxiv("2305.18290"), aka: "dpo",
      text: "Drops the separate reward model and the RL loop, turning preference pairs directly into a simple classification-style loss." },
    { id: "reasoning", label: "Reasoning models", needs: ["gpt", "policygrad"], year: 2022, ref: arxiv("2201.11903"), aka: "cot reasoning models thinking",
      text: "Models that write out intermediate steps before answering do much better at maths and code. Reasoning models are trained with RL on problems with checkable answers to think for longer and better." },
    { id: "ttc", label: "Test-time compute", needs: ["reasoning", "montecarlo", "mcts"], year: 2024, aka: "inference scaling best of n thinking budget",
      text: "Spend more computation when answering instead of when training: longer reasoning, sampling many answers and keeping the best, search over intermediate steps. A second way to scale, alongside model size." },
    { id: "synthetic", label: "Synthetic data", year: 2022, needs: ["gpt", "distill"], aka: "self-instruct generated data",
      text: "Training data written by other models: instruction pairs, reasoning traces, rephrased web text. Increasingly important as good human-written text runs short." },
    { id: "openweights", label: "Open-weight models", needs: ["gpt", "instruct", "moe"], year: 2023, ref: arxiv("2302.13971"), aka: "llama mistral qwen deepseek open source",
      text: "Llama, Mistral, Qwen, DeepSeek: models whose weights are published for anyone to run, study and fine-tune. DeepSeek's releases around the start of 2025 showed open models could get close to the frontier for far less training compute." },
  ]);

  add("models", "Vision", [
    { id: "alexnet", label: "AlexNet", needs: ["cnn", "gpu", "cuda", "dropout", "activations", "imagenet"], year: 2012, aka: "imagenet",
      text: "A CNN trained on two gaming GPUs that won the 2012 ImageNet challenge by a wide margin. The usual starting point of the deep learning era." },
    { id: "resnet", label: "ResNet", needs: ["cnn", "residual", "norm", "imagenet"], year: 2015, ref: arxiv("1512.03385"),
      text: "A 152-layer CNN made trainable by residual connections. Its blocks, and the lessons of the paper, are reused almost everywhere." },
    { id: "detection", label: "Object detection", needs: ["cnn", "labelling"], year: 2015, ref: arxiv("1506.02640"), aka: "yolo r-cnn detr bounding box",
      text: "Find and box every object in an image. R-CNN, Faster R-CNN and YOLO made it fast enough for live video." },
    { id: "vit", label: "Vision Transformer", needs: ["transformer", "imagenet"], year: 2020, ref: arxiv("2010.11929"), aka: "vit patches",
      text: "Cut an image into 16x16 patches, treat them as tokens, and use a plain transformer. Given enough data it matches or beats CNNs." },
    { id: "segmentation", label: "Segmentation", needs: ["cnn", "unet", "vit", "labelling"], ref: arxiv("2304.02643"), aka: "mask r-cnn sam segment anything",
      text: "Label every pixel. Segment Anything (SAM) does it for arbitrary objects from a single click or box." },
    { id: "nerf", label: "NeRF and 3D splatting", needs: ["mlp", "posenc", "integrals"], year: 2020, ref: arxiv("2003.08934"), aka: "3d reconstruction neural radiance",
      text: "Rebuild a 3D scene from photos by learning a function from position and view direction to colour and density, rendered by integrating along rays. Gaussian splatting does the same with millions of explicit blobs, in real time." },
  ]);

  add("models", "Generative and multimodal", [
    { id: "clip", label: "CLIP", needs: ["contrastive", "vit", "transformer", "webdata"], year: 2021, ref: arxiv("2103.00020"), aka: "image text embedding",
      text: "Image and text encoders trained so that matching pairs land close together, on 400 million pairs from the web. The bridge that lets a text prompt steer an image model." },
    { id: "ldm", label: "Latent diffusion", needs: ["diffusion", "vae", "unet", "attention", "clip"], year: 2021, ref: arxiv("2112.10752"), aka: "stable diffusion",
      text: "Run diffusion in a VAE's compressed latent space instead of on pixels, conditioned on text through cross-attention. Made good image generation cheap enough for a consumer GPU." },
    { id: "cfg", label: "Classifier-free guidance", needs: ["diffusion", "conditional"], year: 2022, ref: arxiv("2207.12598"), aka: "guidance scale",
      text: "Blend conditional and unconditional predictions to push samples harder towards the prompt. The guidance scale setting in image generators." },
    { id: "dit", label: "Diffusion transformers", needs: ["diffusion", "transformer", "flows"], year: 2022, ref: arxiv("2212.09748"), aka: "dit video generation",
      text: "Replace the U-Net denoiser with a transformer over latent patches. Scales better, and sits under most current image and video generators." },
    { id: "stylegan", label: "StyleGAN", needs: ["gan", "norm"], year: 2018, ref: arxiv("1812.04948"),
      text: "A GAN that injects style at every resolution, giving fine control over generated images. Behind the first photorealistic fake faces." },
    { id: "vlm", label: "Vision-language models", needs: ["vit", "gpt", "clip"], year: 2023, ref: arxiv("2304.08485"), aka: "llava multimodal llm",
      text: "Feed image patch embeddings into a language model as if they were tokens, so it can describe, read and reason about pictures." },
  ]);

  add("models", "Speech", [
    { id: "wavenet", label: "WaveNet", needs: ["cnn", "autoregressive"], year: 2016, ref: arxiv("1609.03499"), aka: "text to speech tts",
      text: "Generates raw audio one sample at a time with dilated convolutions. The jump to natural-sounding text to speech." },
    { id: "whisper", label: "Whisper", needs: ["transformer", "seq2seq", "fourier", "webdata"], year: 2022, ref: arxiv("2212.04356"), aka: "speech recognition asr",
      text: "An encoder-decoder transformer trained on 680,000 hours of web audio to transcribe and translate speech, reading log-mel spectrograms." },
  ]);

  add("models", "Reinforcement learning", [
    { id: "dqn", label: "Deep Q-networks", needs: ["qlearning", "cnn"], year: 2013, ref: arxiv("1312.5602"), aka: "dqn atari",
      text: "Q-learning with a CNN reading raw pixels, plus a replay buffer for stability. Learned dozens of Atari games from the screen alone." },
    { id: "ppo", label: "PPO", needs: ["policygrad", "mlp"], year: 2017, ref: arxiv("1707.06347"), aka: "proximal policy optimization",
      text: "A policy gradient method that clips each update so the policy never moves too far at once. Stable enough to become the default, including for RLHF." },
    { id: "alphazero", label: "AlphaGo and AlphaZero", needs: ["mcts", "resnet", "policygrad", "qlearning"], year: 2016, ref: arxiv("1712.01815"), aka: "self-play go chess",
      text: "Tree search guided by a network that predicts good moves and who is winning, trained by playing itself. Beat the world's best at Go, then learned chess and shogi from the rules alone." },
  ]);

  add("models", "Efficiency", [
    { id: "lora", label: "LoRA", needs: ["svd", "transformer"], year: 2021, ref: arxiv("2106.09685"), aka: "low rank adaptation peft fine-tuning qlora",
      text: "Freeze the model and learn small low-rank updates to its weight matrices. Fine-tuning drops from all of the parameters to well under one percent of them." },
    { id: "quant", label: "Quantisation", needs: ["float", "transformer"], year: 2022, ref: arxiv("2210.17323"), aka: "int8 int4 gptq gguf awq",
      text: "Store weights in 8 or 4 bits instead of 16, with little loss in quality. How a 70B model fits on one GPU, or a 7B model on a laptop." },
    { id: "distill", label: "Knowledge distillation", needs: ["kl", "softmax"], year: 2015, ref: arxiv("1503.02531"), aka: "teacher student",
      text: "Train a small student model to match a large teacher's output probabilities, which carry more information than hard labels." },
    { id: "flashattn", label: "FlashAttention", needs: ["selfattn", "hbm", "cuda"], year: 2022, ref: arxiv("2205.14135"),
      text: "Exact attention, reorganised into tiles that stay in fast on-chip memory so the full attention matrix is never written out. Much faster, and a big reason context windows grew." },
    { id: "kvcache", label: "KV cache", needs: ["selfattn", "autoregressive", "hbm"], ref: arxiv("2309.06180"), aka: "pagedattention",
      text: "Keep each token's keys and values so generation does not recompute them. Paging that cache like virtual memory (as vLLM does) lets one server batch many more users." },
    { id: "specdec", label: "Speculative decoding", needs: ["autoregressive", "montecarlo"], year: 2022, ref: arxiv("2211.17192"), aka: "draft model",
      text: "A small model drafts several tokens and the large model checks them all in one pass. Same output distribution, fewer slow steps." },
    { id: "longctx", label: "Long context", year: 2023, needs: ["posenc", "flashattn", "kvcache"], aka: "context window rope scaling million tokens",
      text: "Context windows grew from about 2,000 tokens to a million and more, through cheaper attention, position encodings that stretch, and leaner KV caches. Whole codebases and books now fit in one prompt." },
  ]);

  add("models", "Retrieval and science", [
    { id: "denseretrieval", label: "Dense retrieval", needs: ["embeddings", "bert", "ann", "contrastive"], aka: "embedding model semantic search",
      text: "Encode queries and documents as vectors and search by similarity, so results match meaning instead of exact words." },
    { id: "alphafold", label: "AlphaFold", needs: ["selfattn", "transformer"], year: 2020, ref: "https://www.nature.com/articles/s41586-021-03819-2", aka: "protein folding",
      text: "Predicts a protein's 3D structure from its amino-acid sequence, using attention over evolutionary alignments and residue pairs. Effectively solved a 50-year-old problem at CASP14 in 2020." },
  ]);

  add("models", "Understanding models", [
    { id: "interp", label: "Interpretability", year: 2020, needs: ["transformer", "autoencoder", "logreg"], aka: "mechanistic circuits probing sparse autoencoders features",
      text: "Working out what a trained network actually computes: probes that read concepts out of activations, circuits traced through attention heads, and sparse autoencoders that split activations into human-readable features." },
  ]);

  /* ---------------- fields ---------------- */

  add("fields", "Umbrella", [
    { id: "ai", label: "Artificial intelligence", needs: ["ml", "dl", "search", "kr", "rl"], year: 1956,
      text: "The whole project of making machines do things that seem to need intelligence. Named at the Dartmouth workshop in 1956; learning from data became its dominant approach only decades later." },
    { id: "ml", label: "Machine learning", year: 1959, needs: ["supervised", "unsupervised", "loss", "validation", "sklearn"],
      text: "Programs that improve from data instead of from hand-written rules." },
    { id: "dl", label: "Deep learning", year: 2006, needs: ["ml", "mlp", "backprop", "sgd", "adam", "init", "gpu", "pytorch", "tensorflow", "jax", "alexnet"],
      text: "Machine learning with many-layered neural networks, trained end to end on GPUs. Took over vision, then speech, then language, from 2012 on." },
  ]);

  add("fields", "Domains", [
    { id: "nlp", label: "Natural language processing", year: 1954, needs: ["dl", "tokenization", "word2vec", "bert", "hmm", "naivebayes"], aka: "nlp text",
      text: "Getting computers to read and write human language: tagging, parsing, translation, question answering." },
    { id: "cv", label: "Computer vision", year: 1966, needs: ["dl", "opencv", "alexnet", "resnet", "detection", "segmentation", "vit"], aka: "vision images",
      text: "Extracting meaning from images and video: classification, detection, segmentation, tracking, 3D." },
    { id: "speech", label: "Speech and audio", year: 1952, needs: ["dl", "fourier", "hmm", "wavenet", "whisper"], aka: "asr tts",
      text: "Recognising, generating and understanding sound: transcription, text to speech, music." },
    { id: "rl", label: "Reinforcement learning", year: 1988, needs: ["mdp", "qlearning", "policygrad", "dqn", "ppo", "alphazero", "gym"], aka: "rl",
      text: "Learning by trial and error from rewards, rather than from labelled examples." },
    { id: "recsys", label: "Recommender systems", year: 1992, needs: ["ml", "embeddings", "svd", "boosting", "ann"], aka: "recommendation collaborative filtering",
      text: "Predicting what each user will want next from past behaviour. Quietly the most commercially important ML of the last fifteen years." },
    { id: "robotics", label: "Robotics", year: 1961, needs: ["rl", "cv", "odes", "vlm"], aka: "control",
      text: "Perception, planning and control for machines acting in the physical world." },
    { id: "timeseries", label: "Time series", year: 1970, needs: ["ml", "arima", "lstm", "boosting", "transformer", "fourier"], aka: "forecasting temporal",
      text: "Predicting demand, prices, load and weather from sequences of past measurements." },
    { id: "datascience", label: "Data science", year: 2008, needs: ["ml", "pandas", "jupyter", "hypothesis", "sklearn"], aka: "analytics",
      text: "Turning data into decisions: cleaning, exploring, testing and modelling, mostly in notebooks." },
  ]);

  add("fields", "Frontier", [
    { id: "llm", label: "Large language models", year: 2020, needs: ["nlp", "gpt", "scaling", "incontext", "instruct", "rlhf", "deepspeed", "flashattn", "hf", "openweights", "synthetic", "longctx"], aka: "llm",
      text: "Very large transformers trained on much of the written internet, then tuned to follow instructions. The general-purpose engine under most current AI products." },
    { id: "genai", label: "Generative AI", year: 2022, needs: ["llm", "ldm", "dit", "gan", "vae", "stylegan", "cfg"], aka: "gen ai genai",
      text: "Models that produce new text, images, audio, video and code by sampling from learned distributions." },
    { id: "multimodal", label: "Multimodal AI", year: 2021, needs: ["llm", "cv", "speech", "clip", "vlm"],
      text: "Single models that take in and produce text, images, audio and video together." },
  ]);

  /* ---------------- applications ---------------- */

  add("apps", "Assistants", [
    { id: "chat", label: "Chat assistants", year: 2022, needs: ["llm", "rlhf", "reasoning", "kvcache", "ttc"], aka: "chatgpt claude gemini chatbot",
      text: "An instruction-tuned LLM behind a conversation, usually with search, files and tools attached." },
    { id: "rag", label: "Retrieval-augmented generation", needs: ["llm", "denseretrieval", "vectordb"], year: 2020, ref: arxiv("2005.11401"), aka: "rag",
      text: "Fetch relevant documents first and put them in the prompt, so answers rest on sources the model can quote rather than on memory alone." },
    { id: "agents", label: "Agents and tool use", needs: ["llm", "reasoning", "rag", "longctx"], year: 2022, ref: arxiv("2210.03629"), aka: "react function calling mcp",
      text: "LLMs that call tools, read the results and decide what to do next, in a loop, so they can browse, run code and finish multi-step tasks." },
    { id: "coding", label: "Coding assistants", year: 2021, needs: ["llm", "agents", "reasoning", "longctx", "ttc"], aka: "copilot code generation",
      text: "Autocomplete, chat and autonomous agents that read and edit whole codebases. One of the first places LLMs changed everyday work." },
    { id: "safety", label: "Alignment and evaluation", year: 2016, needs: ["llm", "rlhf", "dpo", "metrics", "hypothesis", "interp"], ref: arxiv("2212.08073"), aka: "benchmarks evals red teaming interpretability constitutional ai",
      text: "Measuring what models can do and making them behave as intended: benchmarks, red-teaming, interpretability, and training methods such as Constitutional AI." },
  ]);

  add("apps", "Media", [
    { id: "t2i", label: "Image and video generation", year: 2021, needs: ["genai", "ldm", "dit", "cfg", "clip", "diffusers"], aka: "text to image midjourney sora",
      text: "A text prompt in, a picture or a clip out." },
    { id: "voice", label: "Voice and transcription", year: 2011, needs: ["speech", "whisper", "wavenet", "llm"], aka: "speech to text",
      text: "Speech recognition on the way in, a language model in the middle, speech synthesis on the way out." },
    { id: "translation", label: "Machine translation", year: 1954, needs: ["nlp", "seq2seq", "transformer"], aka: "google translate",
      text: "The problem the transformer was invented for. Switched from phrase tables to neural networks around 2016." },
  ]);

  add("apps", "Physical world", [
    { id: "driving", label: "Autonomous driving", year: 2004, needs: ["cv", "detection", "segmentation", "robotics"], aka: "self-driving",
      text: "Perception from cameras and lidar, prediction of what everyone nearby will do, and planning, all in real time." },
    { id: "medical", label: "Medical imaging", year: 2015, needs: ["cv", "unet", "segmentation", "validation"], aka: "radiology",
      text: "Finding tumours, fractures and retinal disease in scans, where validation on held-out patients matters more than anywhere." },
    { id: "bio", label: "Protein and drug design", needs: ["alphafold", "diffusion", "gnn"], aka: "biology chemistry",
      text: "Predicting structures, generating new proteins with diffusion, and screening molecules with graph networks." },
  ]);

  add("apps", "Ranking", [
    { id: "feeds", label: "Search and feeds", year: 1998, needs: ["recsys", "denseretrieval", "boosting", "bert"], aka: "ranking ads",
      text: "Web search, shopping, ads and social feeds: retrieve candidates, then rank them with learned models, billions of times a day." },
  ]);

  add("apps", "Serving", [
    { id: "vectordb", label: "Vector databases", year: 2019, needs: ["ann", "faiss", "embeddings"], aka: "pinecone pgvector",
      text: "Databases that store embeddings and answer nearest-neighbour queries at scale. The memory layer behind most RAG systems." },
    { id: "vllm", label: "Inference servers", year: 2023, needs: ["llm", "kvcache", "specdec", "pytorch", "cuda"], ref: "https://github.com/vllm-project/vllm", aka: "vllm sglang tensorrt serving",
      text: "Software such as vLLM that serves a model to many users at once, batching requests and managing the KV cache." },
    { id: "local", label: "Local models (llama.cpp)", year: 2023, needs: ["llm", "quant", "cpu", "openweights"], ref: "https://github.com/ggml-org/llama.cpp", aka: "llama.cpp ollama on-device",
      text: "Plain C and C++ inference over quantised weights, so open models run on laptops and phones without a datacentre GPU." },
  ]);

  window.DSMAI = { layers, nodes };
})();
