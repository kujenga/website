package main

/*
#include <stdlib.h>
*/
import "C"
import (
	"fmt"
	"time"
)

func Random() int {
	return int(C.random())
}

func Seed(i int) {
	C.srandom(C.uint(i))
}

func main() {
	fmt.Printf("Deterministic random: %v\n", Random())
	Seed(int(time.Now().Unix()))
	fmt.Printf("Seeded random: %v\n", Random())
}
