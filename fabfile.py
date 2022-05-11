import os
from fabric.api import local, run, cd, env, sudo, settings, lcd,prompt
from fabric.colors import red
from fabric.decorators import hosts

env.hosts = ['sama@tuteria.com']

password = os.getenv('PRODUCTION_PASSWORD', '')

@hosts("sama@tutor-search.tuteria.com")
def deploy_dev(build_no="latest"):
    code_dir = "/home/sama/development/tuteria-deploy"
    with settings(user="sama", password=password):
        with cd(code_dir):
            run("pwd")
            print(build_no)
            run("DEV_DEPLOY_VERSION={} docker-compose pull request-next".format(build_no))
            run("docker-compose up -d request-next")
            run('docker image prune -f')
            run('docker container prune -f')

