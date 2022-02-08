package main

import (
	"html/template"
	"strings"

	"github.com/gopherjs/gopherjs/js"
)

var page = template.Must(template.New("page").Parse(`
<form action="" method="get" class="form-example">
  <div class="form-example">
    <label for="name">Name: </label>
    <input type="text" name="name" id="name" required>
  </div>
  <div class="form-example">
    <label for="email">Enter your email: </label>
    <input type="email" name="email" id="email" required>
  </div>
  <div class="form-example">
    <input type="submit" value="Subscribe!">
  </div>
</form>
`))

func main() {
	var b strings.Builder
	err := page.Execute(&b, nil)
	if err != nil {
		panic(err)
	}

	js.Global.Get("document").Call("write", b.String())
}
