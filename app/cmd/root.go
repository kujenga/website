// Package cmd serve static files based on input configuration.
package cmd

import (
	"fmt"
	"os"

	"github.com/kujenga/site/app/site"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"go.uber.org/zap"
)

var rootCmd = &cobra.Command{
	Use:   "app",
	Short: "Serving static files for a website.",
	Run: func(cmd *cobra.Command, args []string) {
		logCfg := zap.NewProductionConfig()
		logCfg.EncoderConfig.MessageKey = "message"
		logger, err := logCfg.Build()
		if err != nil {
			panic(err)
		}
		defer logger.Sync()

		port := viper.GetInt("port")
		directory := viper.GetString("directory")

		s := site.NewServer(logger, port, directory)
		s.Serve()
	},
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}

func init() {
	cobra.OnInitialize(initConfig)

	// NOTE: This flag is automatically bound to the PORT env var, which is
	// wanted by app engine, and should not be modified.
	rootCmd.PersistentFlags().
		Int("port", 8080, "port to listen on")
	viper.BindPFlag("port", rootCmd.PersistentFlags().Lookup("port"))
	rootCmd.PersistentFlags().
		String("directory", "./public", "directory to serve content from")
	viper.BindPFlag("directory", rootCmd.PersistentFlags().Lookup("directory"))
}

func initConfig() {
	viper.AutomaticEnv()
}
