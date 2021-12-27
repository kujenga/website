// Package cmd serve static files based on input configuration.
package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"go.uber.org/zap"

	"github.com/kujenga/website/app/site"
)

var rootCmd = &cobra.Command{
	Use:   "app",
	Short: "Serving static files for a website.",
	RunE: func(cmd *cobra.Command, args []string) error {
		s, err := getSiteServer()
		if err != nil {
			return err
		}
		return s.Serve()
	},
}

func getSiteServer() (*site.Server, error) {
	logCfg := zap.NewProductionConfig()
	logCfg.EncoderConfig.MessageKey = "message"
	logger, err := logCfg.Build()
	if err != nil {
		return nil, err
	}
	defer logger.Sync()

	return site.NewServer(site.Config{
		Log:       logger,
		Dev:       viper.GetBool("dev"),
		Port:      viper.GetInt("port"),
		Interface: viper.GetString("interface"),
	}), nil
}

// Execute sets off the root command for this package, parsing parameters and
// updating the applications.
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}

func init() {
	cobra.OnInitialize(initializeConfig)

	rootCmd.PersistentFlags().
		Bool("dev", false, "is development environment")
	viper.BindPFlag("dev", rootCmd.PersistentFlags().Lookup("dev"))

	// NOTE: This flag is automatically bound to the PORT env var, which is
	// wanted by app engine, and should not be modified.
	rootCmd.PersistentFlags().
		Int("port", 8080, "port to listen on")
	viper.BindPFlag("port", rootCmd.PersistentFlags().Lookup("port"))

	rootCmd.PersistentFlags().String(
		"interface", "", "interface to listen on")
	viper.BindPFlag("interface",
		rootCmd.PersistentFlags().Lookup("interface"))
}

func initializeConfig() {
	viper.AutomaticEnv()
}
