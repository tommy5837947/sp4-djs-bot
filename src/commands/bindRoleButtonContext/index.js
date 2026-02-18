import { ApplicationCommandType, ContextMenuCommandBuilder } from "discord.js";
import {
    BUTTON_ROLE_CONTEXT_NAME,
    isButtonRoleContextCommand,
    showButtonRoleContextModal,
} from "@/core/buttonRoleContext";

export const command = new ContextMenuCommandBuilder()
    .setName(BUTTON_ROLE_CONTEXT_NAME)
    .setType(ApplicationCommandType.Message);

export const action = async (interaction) => {
    if (!isButtonRoleContextCommand(interaction)) return;
    await showButtonRoleContextModal(interaction);
};

