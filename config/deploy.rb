set :application, 'utah-dabc-api'
set :repo_url, 'git@github.com:jeffstieler/utah-dabc-api.git'

# Branch options
# Prompts for the branch name (defaults to current branch)
# ask :branch, proc { `git rev-parse --abbrev-ref HEAD`.chomp }

# Hardcodes branch to always be master
# This could be overridden in a stage config file
set :branch, :master

set :deploy_to, -> { "/srv/www/#{fetch(:application)}" }

# Use :debug for more verbose output when troubleshooting
set :log_level, :info

namespace :deploy do
  desc 'Restart application'
  task :restart do
    on roles(:app), in: :sequence, wait: 5 do
      # Your restart mechanism here, for example:
      # execute :service, :nginx, :reload
    end
  end
end

# The above restart task is not run by default
# Uncomment the following line to run it on deploys if needed
# after 'deploy:publishing', 'deploy:restart'
